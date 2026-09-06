import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ModuleGuard } from "@/components/module-guard";
import { FinanceAccountingWorkspaceV2 } from "@/components/finance-accounting-workspace-v2";
import { FinanceAdvancedTools } from "@/components/finance-advanced-tools";
import { NuvaFinancialControl } from "@/components/nuva-financial-control";
import { useBizList } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/finance-professional")({
  head: () => ({ meta: [{ title: "Centro Financiero Profesional — Nüva One" }] }),
  component: FinanceProfessional,
});

function FinanceProfessional() {
  const { data: transactions = [] } = useBizList<any>("transactions", { order: "tx_date", ascending: false });
  const { data: products = [] } = useBizList<any>("products");
  const control = useMemo(() => ({
    income: transactions.filter((row: any) => row.type === "income").reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0),
    expense: transactions.filter((row: any) => row.type === "expense").reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0),
    inventoryValue: products.reduce((sum: number, row: any) => sum + Number(row.stock || 0) * Number(row.price || 0), 0),
  }), [transactions, products]);

  return (
    <ModuleGuard module="finance">
      <div className="space-y-5">
        <NuvaFinancialControl income={control.income} expense={control.expense} inventoryValue={control.inventoryValue} />
        <FinanceAdvancedTools />
        <FinanceAccountingWorkspaceV2 />
      </div>
    </ModuleGuard>
  );
}
