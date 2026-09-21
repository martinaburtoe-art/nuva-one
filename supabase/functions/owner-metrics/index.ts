import { withSupabase } from "npm:@supabase/server@^1";

function json(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    const userId = ctx.userClaims?.id ?? ctx.jwtClaims?.sub;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const { data: owner, error: ownerError } = await ctx.supabaseAdmin.auth.admin.getUserById(userId);
    if (ownerError || owner?.user?.app_metadata?.platform_role !== "owner") return json({ error: "Forbidden" }, 403);

    const { data: telemetry, error: telemetryError } = await ctx.supabaseAdmin.rpc("get_owner_operational_metrics", { p_window_hours: 24 });
    if (telemetryError) {
      console.error("owner operational metrics error", telemetryError);
      return json({ error: "Unable to load operational metrics" }, 500);
    }

    const source = (telemetry ?? {}) as Record<string, unknown>;
    const services = (source.services ?? {}) as Record<string, unknown>;
    const vitals = (source.vitals ?? {}) as Record<string, unknown>;

    return json({
      generated_at: source.generated_at ?? new Date().toISOString(),
      environment: "production",
      privacy_mode: "aggregate_only",
      telemetry: {
        source_available: Boolean(source.source_available),
        events_24h: Number(source.events ?? 0),
        error_events_24h: Number(source.error_events ?? 0),
        distinct_errors_24h: Number(source.distinct_errors ?? 0),
      },
      services,
      vitals,
      policy: {
        stores_personal_data: false,
        stores_request_bodies: false,
        stores_tokens: false,
        stores_cookies: false,
        stores_ip_addresses: false,
        retention_days: 30,
      },
    });
  }),
};
