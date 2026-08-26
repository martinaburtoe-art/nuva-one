import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/checkout-demo")({
  head: () => ({ meta: [{ title: "Checkout — Nüva One" }] }),
  component: CheckoutDemoRedirect,
});

function CheckoutDemoRedirect() {
  const search = useSearch({ from: "/checkout-demo" });

  useEffect(() => {
    const plan = search?.plan === "start" ? "start" : "pro";
    const billing = search?.billing === "annual" ? "annual" : "monthly";
    window.location.replace(`/checkout?plan=${plan}&billing=${billing}`);
  }, [search]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <p className="text-sm font-medium">Nüva One</p>
        <h1 className="mt-2 text-xl font-semibold">Preparando tu checkout…</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Te estamos llevando al checkout oficial de Nüva One.
        </p>
      </div>
    </main>
  );
}
