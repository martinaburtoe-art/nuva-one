import { withSupabase } from "npm:@supabase/server@^1";

export default {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    const userId = ctx.userClaims?.id ?? ctx.jwtClaims?.sub;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await ctx.supabaseAdmin.rpc("get_platform_owner_metrics", {
      p_owner_id: userId,
    });

    if (error) {
      if (error.code === "42501") return Response.json({ error: "Forbidden" }, { status: 403 });
      console.error("owner-metrics rpc error", error);
      return Response.json({ error: "Unable to load owner metrics" }, { status: 500 });
    }

    const { data: telemetry, error: telemetryError } = await ctx.supabaseAdmin.rpc("platform_metrics", {});

    return Response.json(
      {
        ...(data as Record<string, unknown>),
        telemetry: telemetryError ? null : telemetry,
      },
      { headers: { "Cache-Control": "private, max-age=30" } },
    );
  }),
};
