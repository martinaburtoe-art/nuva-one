import { supabase } from "@/lib/supabase";

type PlatformEvent = {
  event_name: string;
  event_type: "page_view" | "session" | "auth" | "ai" | "error" | "performance" | "business";
  business_id?: string | null;
  user_id?: string | null;
  route?: string | null;
  duration_ms?: number | null;
  status_code?: number | null;
  metadata?: Record<string, unknown>;
};

/**
 * Fire-and-forget telemetry. Never blocks or breaks the product if telemetry fails.
 * The database remains protected from direct client inserts; this helper is the
 * client contract that will feed the server-side ingestion endpoint.
 */
export function trackPlatformEvent(event: PlatformEvent) {
  void supabase.functions.invoke("platform-telemetry", { body: event }).catch(() => undefined);
}

export function trackPageView(route: string) {
  trackPlatformEvent({ event_name: "page_view", event_type: "page_view", route });
}
