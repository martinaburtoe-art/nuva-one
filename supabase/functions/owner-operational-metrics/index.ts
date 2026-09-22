import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}

Deno.serve(async (req) => {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return json({ error: "Unauthorized" }, 401);

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);
  if (authData.user.app_metadata?.platform_role !== "owner") return json({ error: "Forbidden" }, 403);

  // Enforce the documented 30-day operational retention whenever the private
  // console is accessed. The table contains technical signals only.
  await admin
    .from("owner_operational_events")
    .delete()
    .lt("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString());

  const { data: telemetry, error: telemetryError } = await admin.rpc(
    "get_owner_operational_metrics",
    { p_window_hours: 24 },
  );
  if (telemetryError) {
    console.error("owner operational metrics error", telemetryError.code);
    return json({ error: "Unable to load operational metrics" }, 500);
  }

  const source = (telemetry ?? {}) as Record<string, unknown>;
  return json({
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
  });
});
