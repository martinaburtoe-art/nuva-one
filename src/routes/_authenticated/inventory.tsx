import { createFileRoute } from "@tanstack/react-router";
import { InventoryWorkspace } from "@/components/inventory-workspace";
import { InventorySmartImport } from "@/components/inventory-smart-import";
import { ModuleInformation } from "@/components/module-information";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventario — Nüva One" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  return (
    <div className="space-y-5">
      <ModuleInformation
        title="Inventario"
        summary="Controla existencias, disponibilidad, movimientos y abastecimiento sin perder trazabilidad."
        purpose="Mantener una visión única del stock real y proyectado, detectar riesgos de quiebre, administrar productos y convertir necesidades de reposición en acciones."
        includes={[
          "Inteligencia de inventario y estados de stock",
          "Catálogo de productos, SKU y parámetros de reposición",
          "Abastecimiento y recomendaciones de compra",
          "Movimientos, ajustes trazables y conteo físico",
          "Importación inteligente y exportación de información",
        ]}
        data="Se alimenta principalmente de productos, stock, reservas, stock en tránsito, mínimos, puntos de reposición, costos y movimientos registrados para el negocio activo."
        actions={[
          "Identificar productos críticos o próximos a quiebre",
          "Revisar disponibilidad y stock comprometido",
          "Crear o actualizar productos y sus parámetros",
          "Ajustar existencias dejando trazabilidad del motivo",
          "Preparar abastecimiento y exportar información",
        ]}
      />
      <InventoryWorkspace />
      <InventorySmartImport />
    </div>
  );
}
