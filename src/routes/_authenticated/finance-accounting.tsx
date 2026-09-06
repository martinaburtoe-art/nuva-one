import { createFileRoute } from "@tanstack/react-router";
import { ModuleGuard } from "@/components/module-guard";
import { FinanceAccountingWorkspaceV2 } from "@/components/finance-accounting-workspace-v2";

export const Route = createFileRoute("/_authenticated/finance-accounting")({
  head: () => ({ meta: [{ title: "Contabilidad y Tributación — Nüva One" }] }),
  component: FinanceAccounting,
});

function FinanceAccounting() {
  return (
    <ModuleGuard module="finance">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Finanzas · Herramienta</p>
          <h1 className="mt-1 text-2xl font-semibold">Contabilidad y tributación</h1>
          <p className="mt-1 text-sm text-muted-foreground">Workspace profesional para contabilidad, IVA, documentos y cierre.</p>
        </div>
        <FinanceAccountingWorkspaceV2 />
      </div>
    </ModuleGuard>
  );
}
