import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { InventoryScannerOperations } from "@/components/inventory-scanner-operations";

export const Route = createFileRoute("/_authenticated/inventario-operaciones")({
  head: () => ({ meta: [{ title: "Operaciones de inventario — Nüva One" }] }),
  component: InventoryOperations,
});

function InventoryOperations() {
  return <ModuleGuard module="inventory"><div className="space-y-6"><PageHeader title="Operaciones de inventario" description="Usa el Scanner para registrar entradas y salidas de stock con trazabilidad y actualización atómica." /><InventoryScannerOperations /></div></ModuleGuard>;
}
