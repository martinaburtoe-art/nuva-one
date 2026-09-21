type TelemetryPayload = {
  event_type: "client_error" | "unhandled_rejection" | "route_error" | "web_vital";
  route?: string;
  error_fingerprint?: string;
  metric_name?: "LCP" | "INP" | "CLS" | "FCP" | "TTFB";
  metric_value?: number;
};

function post(payload: TelemetryPayload) {
  if (typeof window === "undefined") return;
  void fetch("/api/telemetry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify({ ...payload, route: window.location.pathname }),
  }).catch(() => undefined);
}

export function reportOwnerError(error: unknown, eventType: TelemetryPayload["event_type"] = "client_error") {
  const value = error instanceof Error ? error : new Error(String(error));
  const text = `${value.name} ${value.message}`.toLowerCase();
  let fingerprint = "unknown_client_error";
  if (text.includes("failed to fetch dynamically imported module") || text.includes("chunk") || text.includes("importing a module script failed")) fingerprint = "stale_or_failed_chunk";
  else if (text.includes("networkerror") || text.includes("failed to fetch")) fingerprint = "network_error";
  else if (value.name === "TypeError") fingerprint = "type_error";
  else if (value.name === "ReferenceError") fingerprint = "reference_error";
  else if (value.name === "SyntaxError") fingerprint = "syntax_error";
  post({ event_type: eventType, error_fingerprint: fingerprint });
}

export function reportOwnerVital(metricName: TelemetryPayload["metric_name"], metricValue: number) {
  if (!metricName || !Number.isFinite(metricValue)) return;
  post({ event_type: "web_vital", metric_name: metricName, metric_value: Math.max(0, Math.min(1_000_000, metricValue)) });
}
