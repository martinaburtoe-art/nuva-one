import { createFileRoute } from "@tanstack/react-router";
import { InventoryWorkspace } from "@/components/inventory-workspace";
import { InventorySmartImport } from "@/components/inventory-smart-import";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventario — Nüva One" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  return (
    <div className="space-y-5">
      <InventoryWorkspace />
      <InventorySmartImport />
    </div>
  );
}
