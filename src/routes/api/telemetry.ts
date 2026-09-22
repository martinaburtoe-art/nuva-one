import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

const allowedOrigins = new Set(
  (process.env.NUVA_ALLOWED_ORIGINS ?? "https://nuva-one.vercel.app")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

const buckets = new Map<string, { startedAt: number; count: number }>();

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function validPath(value: unknown) {
  if (typeof value !== "string") return "/";
  const raw = value.split("?")[0].slice(0, 240);
  if (!raw.startsWith("/")) return "/";
  return raw.split("/").map((segment) => {
    if (!segment) return "";
    if (segment.includes("@") || /^(mailto:|tel:)/i.test(segment)) return ":redacted";
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return ":id";
    if (/^\d+$/.test(segment)) return ":n";
    if (segment.length > 24 && /^[a-zA-Z0-9_-]+$/.test(segment)) return ":segment";
    if (!/^[a-zA-Z0-9._~!$&()*+,;=:@%-]+$/.test(segment)) return ":redacted";
    return segment.slice(0, 48);
  }).join("/") || "/";
}

const allowedFingerprints = new Set([
  "unknown_client_error",
  "stale_or_failed_chunk",
  "network_error",
  "type_error",
  "reference_error",
  "syntax_error",
]);

function fingerprint(value: unknown) {
  return typeof value === "string" && allowedFingerprints.has(value) ? value : null;
}

export const Route = createFileRoute("/api/telemetry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin && !allowedOrigins.has(origin)) return json({ ok: false }, 403);
        const fetchSite = request.headers.get("sec-fetch-site");
        if (fetchSite === "cross-site") return json({ ok: false }, 403);

        const key = origin ?? "same-origin";
        const now = Date.now();
        const bucket = buckets.get(key);
        if (!bucket || now - bucket.startedAt > 60_000) {
          buckets.set(key, { startedAt: now, count: 1 });
        } else if (bucket.count >= 30) {
          return json({ ok: false }, 429);
        } else {
          bucket.count += 1;
        }

        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > 4096) return json({ ok: false }, 413);

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ ok: false }, 400);
        }

        const eventType = typeof body.event_type === "string" ? body.event_type : "";
        const allowedTypes = new Set(["client_error", "unhandled_rejection", "route_error", "api_error", "web_vital"]);
        if (!allowedTypes.has(eventType)) return json({ ok: false }, 400);

        const metricName = typeof body.metric_name === "string" ? body.metric_name.slice(0, 16) : null;
        const allowedVitals = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);
        if (eventType === "web_vital" && (!metricName || !allowedVitals.has(metricName))) return json({ ok: false }, 400);

        const service = typeof body.service === "string" ? body.service.replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 48) : null;
        const durationMs = Number.isFinite(Number(body.duration_ms)) ? Math.max(0, Math.min(120_000, Math.round(Number(body.duration_ms)))) : null;
        const statusCode = Number.isInteger(body.status_code) ? Math.max(100, Math.min(599, Number(body.status_code))) : null;
        const metricValue = Number.isFinite(Number(body.metric_value)) ? Math.max(0, Math.min(1_000_000, Number(body.metric_value))) : null;

        const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceRoleKey) return json({ ok: false }, 503);

        const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { error } = await supabase.from("owner_operational_events").insert({
          event_type: eventType,
          route: validPath(body.route),
          service,
          status_code: statusCode,
          duration_ms: durationMs,
          metric_name: metricName,
          metric_value: metricValue,
          error_fingerprint: fingerprint(body.error_fingerprint),
          environment: "production",
        });
        if (error) {
          console.error("owner telemetry insert failed", error.code);
          return json({ ok: false }, 503);
        }
        return json({ ok: true });
      },
    },
  },
});
