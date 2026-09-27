import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-utils";
import { InventoryWorkspace } from "@/components/inventory-workspace";
import { InventorySmartImport } from "@/components/inventory-smart-import";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventario — Nüva One" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventario"
        description="Control de stock, disponibilidad y abastecimiento conectado con ventas y compras."
      />
      <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground"><span className="font-medium text-foreground">Inventario conectado.</span> Stock, ventas y abastecimiento trabajan sobre la misma operación.</div>
      <InventoryWorkspace />
      <InventorySmartImport />
    </div>
  );
}
