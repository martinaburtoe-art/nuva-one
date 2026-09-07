import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ModuleGuard } from "@/components/module-guard";
import { ModuleInformation } from "@/components/module-information";
import { FinanceAccountingWorkspaceV2 } from "@/components/finance-accounting-workspace-v2";
import { FinanceAdvancedTools } from "@/components/finance-advanced-tools";
import { FinanceSiiWorkspace } from "@/components/finance-sii-workspace";
import { NuvaFinancialControl } from "@/components/nuva-financial-control";
import { useBizList } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finanzas · Contabilidad · Tributación — Nüva One" }] }),
  component: Finance,
});

function Finance() {
  const { data: transactions = [] } = useBizList<any>("transactions", { order: "tx_date", ascending: false });
  const { data: products = [] } = useBizList<any>("products");

  const control = useMemo(() => {
    const income = transactions.filter((row: any) => row.type === "income").reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
    const expense = transactions.filter((row: any) => row.type === "expense").reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
    const inventoryValue = products.reduce((sum: number, row: any) => sum + Number(row.stock || 0) * Number(row.price || 0), 0);
    return { income, expense, inventoryValue };
  }, [transactions, products]);

  return (
    <ModuleGuard module="finance">
      <div className="space-y-5">
        <ModuleInformation
          title="Finanzas"
          summary="Centro para entender, controlar y tomar decisiones sobre el dinero del negocio, desde la operación diaria hasta la contabilidad y tributación."
          purpose="Concentrar en un solo lugar la situación financiera, el flujo de caja, las cuentas por cobrar, obligaciones, contabilidad, tributación y herramientas de análisis."
          includes={[
            "Control financiero y flujo de caja",
            "Tesorería, cuentas por cobrar y pendientes contables",
            "Facturación y tributación SII integrada",
            "Contabilidad profesional e inteligencia financiera",
          ]}
          data="Utiliza los movimientos, ventas, compras, obligaciones tributarias, productos y registros financieros disponibles para tu negocio. Las cifras dependen de los datos registrados."
          actions={[
            "Revisar la situación financiera actual",
            "Detectar obligaciones y riesgos de liquidez",
            "Analizar cartera y pendientes contables",
            "Emitir, revisar o respaldar información tributaria cuando corresponda",
          ]}
        />
        <NuvaFinancialControl income={control.income} expense={control.expense} inventoryValue={control.inventoryValue} />
        <FinanceSiiWorkspace />
        <FinanceAdvancedTools />
        <FinanceAccountingWorkspaceV2 />
      </div>
    </ModuleGuard>
  );
}
