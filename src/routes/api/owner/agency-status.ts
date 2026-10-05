import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import type { Database } from "@/integrations/supabase/types";

const WORKERS = ["constructor","orchestrator","finance","sales","supply","people","compliance","growth","security","qa","sentinel","ux","release"] as const;

export const Route = createFileRoute("/api/owner/agency-status")({
  server: { handlers: {
    GET: async ({ request }) => {
      const { url, anonKey, serviceRoleKey, ok } = getServerSupabaseEnv();
      if (!ok || !serviceRoleKey) return Response.json({ error: "AGENCY_STATUS_UNAVAILABLE" }, { status: 500 });
      const token = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
      if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });
      const auth = createClient<Database>(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await auth.auth.getUser(token);
      if (error || data.user?.app_metadata?.platform_role !== "owner") return Response.json({ error: "AGENCY_ACCESS_DENIED" }, { status: 403 });

      const db = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const [history, learning] = await Promise.all([
        db.from("agentes_historial").select("session_id,role,created_at").like("session_id", "owner-agency:%").order("created_at", { ascending: false }).limit(500),
        db.from("ops_agent_learning").select("agent_id,confidence,occurrences,last_seen_at").in("agent_id", [...WORKERS]).order("last_seen_at", { ascending: false }).limit(500),
      ]);
      if (history.error) return Response.json({ error: "AGENCY_HISTORY_UNAVAILABLE" }, { status: 500 });

      const now = Date.now();
      const workers = WORKERS.map((agentId) => {
        const rows = (history.data ?? []).filter((r) => r.session_id === `owner-agency:${agentId}`);
        const lessons = (learning.data ?? []).filter((r) => r.agent_id === agentId);
        const last = rows[0]?.created_at ?? lessons[0]?.last_seen_at ?? null;
        const age = last ? now - new Date(last).getTime() : Infinity;
        return { agentId, state: age < 15 * 60_000 ? "active" : age < 24 * 60 * 60_000 ? "recent" : "standby", lastActivity: last, conversations: rows.filter((r) => r.role === "user").length, lessons: lessons.length, confidence: lessons.length ? Math.round(lessons.reduce((s, r) => s + Number(r.confidence ?? 0), 0) / lessons.length * 100) : null };
      });
      return Response.json({ generated_at: new Date().toISOString(), continuous_coverage: true, workers });
    },
  }},
});
