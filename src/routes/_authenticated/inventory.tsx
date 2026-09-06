import { createFileRoute } from "@tanstack/react-router";
import { InventoryWorkspace } from "@/components/inventory-workspace";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventario — Nüva One" }] }),
  component: InventoryWorkspace,
});
