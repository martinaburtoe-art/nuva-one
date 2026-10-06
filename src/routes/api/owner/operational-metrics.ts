import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/owner/operational-metrics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { url, anonKey, serviceRoleKey, ok } = getServerSupabaseEnv();
        if (!ok || !serviceRoleKey) {
          return new Response(JSON.stringify({ error: "Configuración de Supabase incompleta" }), { status: 500 });
        }

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });

        const authClient = createClient<Database>(url, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await authClient.auth.getUser(token);
        if (error || !data.user) {
          return new Response(JSON.stringify({ error: "Sesión inválida o expirada" }), { status: 401 });
        }
        if (data.user.app_metadata?.platform_role !== "owner") {
          return new Response(JSON.stringify({ error: "AGENCY_ACCESS_DENIED" }), { status: 403 });
        }

        const admin = createClient<Database>(url, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        await admin.from("owner_operational_events").delete().lt(
          "created_at",
          new Date(Date.now() - 30 * 86_400_000).toISOString(),
        );

        const { data: telemetry, error: telemetryError } = await admin.rpc(
          "get_owner_operational_metrics",
          { p_window_hours: 24 },
        );
        if (telemetryError) {
          console.error("owner operational metrics error", telemetryError);
          return new Response(JSON.stringify({ error: "Unable to load operational metrics" }), { status: 500 });
        }

        const source = (telemetry ?? {}) as Record<string, unknown>;
        return new Response(JSON.stringify({
          generated_at: source.generated_at ?? new Date().toISOString(),
          environment: "production",
          privacy_mode: "aggregate_only",
          telemetry: {
            source_available: Boolean(source.source_available),
            events_24h: Number(source.events ?? 0),
            error_events_24h: Number(source.error_events ?? 0),
            distinct_errors_24h: Number(source.distinct_errors ?? 0),
            error_rate_5m: Number(source.error_rate_5m ?? 0),
            error_rate_1h: Number(source.error_rate_1h ?? 0),
            latency_p50_ms: source.latency_p50_ms == null ? null : Number(source.latency_p50_ms),
            latency_p95_ms: source.latency_p95_ms == null ? null : Number(source.latency_p95_ms),
            latency_p99_ms: source.latency_p99_ms == null ? null : Number(source.latency_p99_ms),
          },
          services: source.services ?? {},
          vitals: source.vitals ?? {},
          top_errors: Array.isArray(source.top_errors) ? source.top_errors : [],
          policy: {
            stores_personal_data: false,
            stores_request_bodies: false,
            stores_tokens: false,
            stores_cookies: false,
            stores_ip_addresses: false,
            retention_days: 30,
          },
        }), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" },
        });
      },
    },
  },
});
