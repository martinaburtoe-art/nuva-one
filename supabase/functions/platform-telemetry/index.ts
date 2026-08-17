import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401, headers: cors });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

  const body = await req.json();
  const allowedTypes = new Set(["page_view", "session", "auth", "ai", "error", "performance", "business"]);
  if (typeof body.event_name !== "string" || typeof body.event_type !== "string" || !allowedTypes.has(body.event_type)) {
    return new Response("Invalid event", { status: 400, headers: cors });
  }

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await service.from("platform_events").insert({
    event_name: body.event_name.slice(0, 100),
    event_type: body.event_type,
    business_id: body.business_id ?? null,
    user_id: user.id,
    route: typeof body.route === "string" ? body.route.slice(0, 500) : null,
    duration_ms: Number.isInteger(body.duration_ms) && body.duration_ms >= 0 ? body.duration_ms : null,
    status_code: Number.isInteger(body.status_code) ? body.status_code : null,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
  });

  if (error) return new Response("Telemetry unavailable", { status: 503, headers: cors });
  return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
});
