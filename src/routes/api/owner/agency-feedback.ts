import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";

const WORKERS = new Set([
  "constructor","orchestrator","finance","sales","supply","people","compliance",
  "growth","security","qa","sentinel","ux","release",
]);

async function fingerprint(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/owner/agency-feedback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { url, anonKey, serviceRoleKey, ok } = getServerSupabaseEnv();
        if (!ok || !serviceRoleKey) return new Response(JSON.stringify({ error: "Configuración de Agency incompleta" }), { status: 500 });

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });

        const authClient = createClient(url, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await authClient.auth.getUser(token);
        if (error || !data.user) return new Response(JSON.stringify({ error: "Sesión inválida o expirada" }), { status: 401 });
        if (data.user.app_metadata?.platform_role !== "owner") {
          return new Response(JSON.stringify({ error: "AGENCY_ACCESS_DENIED" }), { status: 403 });
        }

        const body = await request.json() as { agentId?: string; prompt?: string; response?: string; helpful?: boolean };
        const agentId = body.agentId ?? "";
        if (!WORKERS.has(agentId)) return new Response(JSON.stringify({ error: "AGENCY_WORKER_NOT_FOUND" }), { status: 400 });
        if (typeof body.helpful !== "boolean" || !body.response?.trim()) {
          return new Response(JSON.stringify({ error: "Feedback incompleto" }), { status: 400 });
        }

        const lessonType = body.helpful ? "success" : "regression";
        const basis = `${agentId}|${(body.prompt ?? "").trim().slice(0, 500)}|${body.response.trim().slice(0, 1500)}`;
        const hash = await fingerprint(basis);
        const privileged = createClient(url, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: previous } = await privileged
          .from("ops_agent_learning")
          .select("confidence,occurrences")
          .eq("agent_id", agentId)
          .eq("fingerprint", hash)
          .maybeSingle();

        const oldConfidence = Number(previous?.confidence ?? 0.5);
        const oldOccurrences = Number(previous?.occurrences ?? 0);
        const confidence = Math.max(0, Math.min(1, oldConfidence + (body.helpful ? 0.05 : -0.1)));

        const { error: upsertError } = await privileged
          .from("ops_agent_learning")
          .upsert({
            agent_id: agentId,
            fingerprint: hash,
            lesson_type: lessonType,
            title: body.helpful ? "Respuesta validada por Owner" : "Respuesta corregida por Owner",
            lesson: body.response.trim().slice(0, 4000),
            confidence,
            occurrences: oldOccurrences + 1,
            metadata: {
              feedback: body.helpful ? "positive" : "negative",
              prompt_excerpt: (body.prompt ?? "").trim().slice(0, 500),
              source: "owner-control-tower",
            },
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "agent_id,fingerprint" });

        if (upsertError) {
          console.error("Agency learning feedback error", upsertError);
          return new Response(JSON.stringify({ error: "No se pudo guardar el aprendizaje" }), { status: 500 });
        }

        return Response.json({ ok: true, confidence, occurrences: oldOccurrences + 1 });
      },
    },
  },
});
