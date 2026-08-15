export type DemoEvent = "demo_started" | "tour_step" | "simulated_sale" | "cta_clicked";

export function trackDemoEvent(event: DemoEvent, metadata: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("nuva:demo", { detail: { event, ...metadata } }));
}
