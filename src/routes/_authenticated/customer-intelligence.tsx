import { createFileRoute, redirect } from "@tanstack/react-router";

// Keep the historical URL working without maintaining a second CRM Intelligence screen.
export const Route = createFileRoute("/_authenticated/customer-intelligence")({
  beforeLoad: () => {
    throw redirect({ to: "/customers-intelligence" });
  },
});
