import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy compatibility route.
 * SII is no longer a top-level module; the complete workspace lives inside Finanzas.
 */
export const Route = createFileRoute("/_authenticated/billing")({
  beforeLoad: () => {
    throw redirect({ to: "/finance" });
  },
});
