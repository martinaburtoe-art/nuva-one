import { supabase } from "@/lib/supabase";

type PlatformEvent = {
  event_name: string;
  event_type: "page_view" | "session" | "auth" | "ai" | "error" | "performance" | "business";
  business_id?: string | null;
  route?: string | null;
  duration_ms?: number | null;
  status_code?: number | null;
  metadata?: Record<string, unknown>;
};

/** Fire-and-forget: observability can never block or break Nüva One. */
export function trackPlatformEvent(event: PlatformEvent) {
  void supabase.functions
    .invoke("platform-telemetry", { body: event })
    .catch(() => undefined);
}

export function trackPageView(route: string) {
  trackPlatformEvent({
    event_name: "page_view",
    event_type: "page_view",
    route,
  });
}

export function captureBrowserPerformance() {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;

  const send = (
    eventName: string,
    value: number,
    metadata: Record<string, unknown> = {},
  ) => {
    if (!Number.isFinite(value) || value < 0) return;

    trackPlatformEvent({
      event_name: eventName,
      event_type: "performance",
      route: window.location.pathname,
      duration_ms: Math.round(value),
      metadata,
    });
  };

  const observe = (
    type: string,
    callback: (entry: PerformanceEntry) => void,
  ) => {
    try {
      const observer = new PerformanceObserver((list) =>
        list.getEntries().forEach(callback),
      );
      observer.observe({ type, buffered: true } as PerformanceObserverInit);
    } catch {
      // Unsupported metric/browser: silently ignore.
    }
  };

  observe("largest-contentful-paint", (entry) =>
    send("web_vital_lcp", entry.startTime),
  );
  observe("first-contentful-paint", (entry) =>
    send("web_vital_fcp", entry.startTime),
  );
  observe("layout-shift", (entry) => {
    const shift = entry as PerformanceEntry & {
      value?: number;
      hadRecentInput?: boolean;
    };
    if (!shift.hadRecentInput) {
      send("web_vital_cls", Number(shift.value ?? 0), { metric: "CLS" });
    }
  });
  observe("event", (entry) => {
    const event = entry as PerformanceEventTiming;
    if (event.interactionId) {
      send("web_vital_inp_candidate", event.duration, { metric: "INP" });
    }
  });

  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (navigation) {
    send(
      "web_vital_ttfb",
      navigation.responseStart - navigation.requestStart,
      { metric: "TTFB" },
    );
  }
}
