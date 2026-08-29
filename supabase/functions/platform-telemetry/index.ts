import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405, headers: cors });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer "))
    return new Response("Unauthorized", { status: 401, headers: cors });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: cors });
  }

  const allowedTypes = new Set([
    "page_view",
    "session",
    "auth",
    "ai",
    "error",
    "performance",
    "business",
  ]);
  if (
    typeof body.event_name !== "string" ||
    typeof body.event_type !== "string" ||
    !allowedTypes.has(body.event_type)
  ) {
    return new Response("Invalid event", { status: 400, headers: cors });
  }

  const requestedBusinessId = typeof body.business_id === "string" ? body.business_id : null;
  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Never trust a client-supplied tenant id. Resolve it server-side and only
  // associate telemetry with a business owned by the authenticated user.
  let businessId: string | null = null;
  if (requestedBusinessId) {
    const { data: business, error: businessError } = await service
      .from("businesses")
      .select("id")
      .eq("id", requestedBusinessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (businessError) return new Response("Telemetry unavailable", { status: 503, headers: cors });
    if (!business) return new Response("Forbidden", { status: 403, headers: cors });
    businessId = business.id;
  }

  const rawMetadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
    ? body.metadata as Record<string, unknown>
    : {};

  // Owner Intelligence consumes technical aggregates only. Do not persist the
  // authenticated user's personal identifier. Route/status/duration remain
  // technical signals and are nested in metadata because platform_events keeps
  // its stable, compact schema.
  const metadata = {
    ...rawMetadata,
    event_type: body.event_type,
    route: typeof body.route === "string" ? body.route.slice(0, 500) : undefined,
    duration_ms:
      Number.isInteger(body.duration_ms) && (body.duration_ms as number) >= 0
        ? body.duration_ms
        : undefined,
    status_code:
      Number.isInteger(body.status_code) &&
      (body.status_code as number) >= 100 &&
      (body.status_code as number) <= 599
        ? body.status_code
        : undefined,
  };

  const { error } = await service.from("platform_events").insert({
    event_name: body.event_name.slice(0, 100),
    business_id: businessId,
    session_id: typeof body.session_id === "string" ? body.session_id.slice(0, 200) : null,
    app_version: typeof body.app_version === "string" ? body.app_version.slice(0, 100) : null,
    environment: typeof body.environment === "string" ? body.environment.slice(0, 50) : "production",
    metadata,
    occurred_at: new Date().toISOString(),
  });

  if (error) return new Response("Telemetry unavailable", { status: 503, headers: cors });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
