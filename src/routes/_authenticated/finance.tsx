import { lazy, Suspense, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
const FinanceAccountingWorkspaceV2 = lazy(() => import("@/components/finance-accounting-workspace-v2").then((m) => ({ default: m.FinanceAccountingWorkspaceV2 })));
const FinanceAdvancedTools = lazy(() => import("@/components/finance-advanced-tools").then((m) => ({ default: m.FinanceAdvancedTools })));
const FinanceSiiWorkspace = lazy(() => import("@/components/finance-sii-workspace").then((m) => ({ default: m.FinanceSiiWorkspace })));
const NuvaFinancialControl = lazy(() => import("@/components/nuva-financial-control").then((m) => ({ default: m.NuvaFinancialControl })));
const CollectionPriorityPanel = lazy(() => import("@/components/collection-priority-panel").then((m) => ({ default: m.CollectionPriorityPanel })));
import { useBizList } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finanzas · Contabilidad · Tributación — Nüva One" }] }),
  component: Finance,
});

function Finance() {
  const { data: transactions = [], isLoading: transactionsLoading } = useBizList<any>("transactions", { order: "tx_date", ascending: false, select: "amount,type" });
  const { data: products = [], isLoading: productsLoading } = useBizList<any>("products", { select: "stock,price" });

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
        <Suspense fallback={<div className="space-y-3" aria-busy="true"><div className="h-28 animate-pulse rounded-2xl border bg-muted/30" /><div className="h-48 animate-pulse rounded-2xl border bg-muted/30" /></div>}>
          <NuvaFinancialControl income={control.income} expense={control.expense} inventoryValue={control.inventoryValue} loading={transactionsLoading || productsLoading} />
          <CollectionPriorityPanel />
          <FinanceSiiWorkspace />
          <FinanceAdvancedTools />
          <FinanceAccountingWorkspaceV2 />
        </Suspense>
      </div>
    </ModuleGuard>
  );
}
