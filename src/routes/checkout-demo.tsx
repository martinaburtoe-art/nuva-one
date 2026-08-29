import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/checkout-demo")({
  head: () => ({ meta: [{ title: "Checkout — Nüva One" }] }),
  component: CheckoutDemoRedirect,
});

function CheckoutDemoRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    const billingParam = params.get("billing");
    const plan = planParam === "start" || planParam === "starter" ? "starter" : "pro";
    const billing = billingParam === "annual" ? "annual" : "monthly";
    window.location.replace(`/checkout?plan=${plan}&billing=${billing}`);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <p className="text-sm font-medium">Nüva One</p>
        <h1 className="mt-2 text-xl font-semibold">Preparando tu checkout…</h1>
        <p className="mt-2 text-sm text-muted-foreground">Te estamos llevando al checkout oficial de Nüva One.</p>
      </div>
    </main>
  );
}
