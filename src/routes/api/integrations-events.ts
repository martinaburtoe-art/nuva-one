import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/integrations-events")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { url, anonKey, ok } = getServerSupabaseEnv();
        if (!ok) return json({ error: "Configuración de Supabase incompleta" }, 500);
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
        const businessId = request.headers.get("x-business-id")?.trim();
        if (!token || !businessId) return json({ error: "Faltan autenticación o x-business-id" }, 401);

        const supabase = createClient<Database>(url, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
        if (claimsError || !claims?.claims?.sub) return json({ error: "Sesión inválida o expirada" }, 401);

        const limitValue = Number(new URL(request.url).searchParams.get("limit") ?? "25");
        const limit = Math.min(Math.max(Number.isFinite(limitValue) ? Math.floor(limitValue) : 25, 1), 100);
        const { data, error } = await supabase
          .from("nuva_integration_events")
          .select("id,provider,event_type,direction,status,error,retry_count,received_at,processed_at")
          .eq("business_id", businessId)
          .order("received_at", { ascending: false })
          .limit(limit);

        if (error) return json({ error: "No se pudieron cargar los eventos de integración" }, 500);
        return json({ events: data ?? [] });
      },
    },
  },
});
