import { createFileRoute } from "@tanstack/react-router";
import { CostsWorkspace } from "@/components/costs-workspace";

export const Route = createFileRoute("/_authenticated/purchases")({
  head: () => ({ meta: [{ title: "Costos — Nüva One" }] }),
  component: CostsWorkspace,
});
