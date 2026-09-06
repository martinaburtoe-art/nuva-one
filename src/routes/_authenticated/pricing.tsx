import { createFileRoute } from "@tanstack/react-router";
import { PricingCalculator } from "@/components/pricing-calculator";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({
    meta: [{ title: "Precios · Nüva One" }],
  }),
  component: PricingCalculator,
});
