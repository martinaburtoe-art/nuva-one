import { createFileRoute } from "@tanstack/react-router";
import { PricingCalculator } from "@/components/pricing-calculator";

export const Route = createFileRoute("/_authenticated/pricing-calculator")({
  head: () => ({ meta: [{ title: "Calculadora de Precio · Nüva One" }] }),
  component: PricingCalculator,
});
