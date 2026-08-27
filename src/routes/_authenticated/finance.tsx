import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ModuleGuard } from "@/components/module-guard";
import { FinanceAccountingWorkspaceV2 } from "@/components/finance-accounting-workspace-v2";
import { NuvaFinancialControl } from "@/components/nuva-financial-control";
import { useActiveBusiness } from "@/lib/use-business";
import { useBizList } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finanzas · Contabilidad · Tributación — Nüva One" }] }),
  component: Finance,
});

function Finance() {
  const { active } = useActiveBusiness();
  const { data: transactions = [] } = useBizList<any>("transactions", {
    order: "tx_date",
    ascending: false,
  });
  const { data: products = [] } = useBizList<any>("products");

  const control = useMemo(() => {
    const income = transactions
      .filter((row: any) => row.type === "income")
      .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
    const expense = transactions
      .filter((row: any) => row.type === "expense")
      .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
    const inventoryValue = products.reduce(
      (sum: number, row: any) => sum + Number(row.stock || 0) * Number(row.price || 0),
      0,
    );
    return { income, expense, inventoryValue };
  }, [transactions, products]);

  return (
    <ModuleGuard module="finance">
      <div className="space-y-5">
        <NuvaFinancialControl
          income={control.income}
          expense={control.expense}
          inventoryValue={control.inventoryValue}
        />
        <a href="/pricing-calculator" className="block rounded-xl border border-primary/20 bg-primary/[0.04] p-4 transition-colors hover:bg-primary/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">₱</div>
            <div><p className="font-medium">Calculadora de precio de venta</p><p className="text-sm text-muted-foreground">Calcula piso, margen, punto de equilibrio y precio recomendado usando costos, mercado y valor.</p></div>
          </div>
        </a>
        <FinanceAccountingWorkspaceV2 />
      </div>
    </ModuleGuard>
  );
}
