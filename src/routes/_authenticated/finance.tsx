import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { FinanceAccountingWorkspaceV2 } from "@/components/finance-accounting-workspace-v2";
import { FinanceAdvancedTools } from "@/components/finance-advanced-tools";
import { FinanceSiiWorkspace } from "@/components/finance-sii-workspace";
import { NuvaFinancialControl } from "@/components/nuva-financial-control";
import { CollectionPriorityPanel } from "@/components/collection-priority-panel";
import { useBizList } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finanzas · Contabilidad · Tributación — Nüva One" }] }),
  component: Finance,
});

function Finance() {
  const { data: transactions = [], isLoading: transactionsLoading } = useBizList<any>("transactions", { order: "tx_date", ascending: false });
  const { data: products = [], isLoading: productsLoading } = useBizList<any>("products");

  const control = useMemo(() => {
    const income = transactions.filter((row: any) => row.type === "income").reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
    const expense = transactions.filter((row: any) => row.type === "expense").reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
    const inventoryValue = products.reduce((sum: number, row: any) => sum + Number(row.stock || 0) * Number(row.price || 0), 0);
    return { income, expense, inventoryValue };
  }, [transactions, products]);

  return (
    <ModuleGuard module="finance">
      <div className="space-y-5">
        <PageHeader
          title="Finanzas"
          description="Control financiero, contabilidad, tributación y decisiones sobre el dinero del negocio."
        />
        <NuvaFinancialControl income={control.income} expense={control.expense} inventoryValue={control.inventoryValue} loading={transactionsLoading || productsLoading} />
        <CollectionPriorityPanel />
        <FinanceSiiWorkspace />
        <FinanceAdvancedTools />
        <FinanceAccountingWorkspaceV2 />
      </div>
    </ModuleGuard>
  );
}
