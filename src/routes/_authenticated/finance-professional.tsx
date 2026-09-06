import { createFileRoute } from "@tanstack/react-router";
import { ModuleGuard } from "@/components/module-guard";
import { FinanceAccountingWorkspaceV2 } from "@/components/finance-accounting-workspace-v2";
import { FinanceAdvancedTools } from "@/components/finance-advanced-tools";
import { NuvaFinancialControl } from "@/components/nuva-financial-control";

export const Route = createFileRoute("/_authenticated/finance-professional")({
  head: () => ({ meta: [{ title: "Centro Financiero Profesional — Nüva One" }] }),
  component: FinanceProfessional,
});

function FinanceProfessional() {
  return (
    <ModuleGuard module="finance">
      <div className="space-y-5">
        <NuvaFinancialControl />
        <FinanceAdvancedTools />
        <FinanceAccountingWorkspaceV2 />
      </div>
    </ModuleGuard>
  );
}
