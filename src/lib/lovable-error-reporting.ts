import { reportOwnerError, reportOwnerVital } from "@/lib/owner-telemetry";

type LovableErrorOptions = { mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary"; handled?: boolean; severity?: "error" | "warning" | "info" };
type LovableEvents = { captureException?: (error: unknown, context?: Record<string, unknown>, options?: LovableErrorOptions) => void };

declare global { interface Window { __lovableEvents?: LovableEvents; __nuvaOwnerTelemetryInstalled?: boolean } }

export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(error, { source: "react_error_boundary", route: window.location.pathname, ...context }, { mechanism: "react_error_boundary", handled: false, severity: "error" });
  reportOwnerError(error, "route_error");
}

if (typeof window !== "undefined" && !window.__nuvaOwnerTelemetryInstalled) {
  window.__nuvaOwnerTelemetryInstalled = true;
  window.addEventListener("error", (event) => reportOwnerError(event.error ?? new Error("window_error"), "client_error"));
  window.addEventListener("unhandledrejection", (event) => reportOwnerError(event.reason ?? new Error("unhandled_rejection"), "unhandled_rejection"));

  const observed = new Set<string>();
  const pendingVitals = new Map<"LCP" | "INP" | "CLS" | "FCP" | "TTFB", number>();

  const once = (name: "LCP" | "INP" | "CLS" | "FCP" | "TTFB", value: number) => {
    if (observed.has(name) || !Number.isFinite(value)) return;
    observed.add(name);
    reportOwnerVital(name, value);
  };

  const stageVital = (name: "LCP" | "INP" | "CLS" | "FCP" | "TTFB", value: number) => {
    if (!Number.isFinite(value)) return;
    pendingVitals.set(name, value);
  };

  const flushVitals = () => {
    for (const [name, value] of pendingVitals) once(name, value);
  };

  try {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.responseStart) stageVital("TTFB", navigation.responseStart - navigation.requestStart);
    const paint = performance.getEntriesByType("paint").find((entry) => entry.name === "first-contentful-paint");
    if (paint) stageVital("FCP", paint.startTime);
  } catch { /* observability must never affect the application */ }

  try {
    if ("PerformanceObserver" in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & { startTime?: number } | undefined;
        if (last) stageVital("LCP", last.startTime ?? 0);
      }).observe({ type: "largest-contentful-paint", buffered: true });

      let cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
          if (!entry.hadRecentInput) cls += entry.value ?? 0;
        }
        stageVital("CLS", cls);
      }).observe({ type: "layout-shift", buffered: true });

      new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1) as PerformanceEntry & { duration?: number } | undefined;
        if (last) stageVital("INP", last.duration ?? 0);
      }).observe({ type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
    }
  } catch { /* unsupported browsers are simply not instrumented */ }

  window.addEventListener("pagehide", flushVitals, { once: true });
  window.setTimeout(flushVitals, 10_000);
