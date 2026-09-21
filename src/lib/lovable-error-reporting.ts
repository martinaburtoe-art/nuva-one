import { reportOwnerError } from "@/lib/owner-telemetry";

type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
    __nuvaOwnerTelemetryInstalled?: boolean;
  }
}

export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    { source: "react_error_boundary", route: window.location.pathname, ...context },
    { mechanism: "react_error_boundary", handled: false, severity: "error" },
  );
  reportOwnerError(error, "route_error");
}

if (typeof window !== "undefined" && !window.__nuvaOwnerTelemetryInstalled) {
  window.__nuvaOwnerTelemetryInstalled = true;
  window.addEventListener("error", (event) => {
    reportOwnerError(event.error ?? new Error("window_error"), "client_error");
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportOwnerError(event.reason ?? new Error("unhandled_rejection"), "unhandled_rejection");
  });
}
