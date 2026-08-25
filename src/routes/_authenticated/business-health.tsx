import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useBizList } from "@/lib/biz-data";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { BusinessHealthCard } from "@/components/executive/business-health-card";
import { buildBusinessHealthIntelligence } from "@/lib/nuva-business-health";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/business-health")({
  head: () => ({ meta: [{ title: "Business Health — Nüva One" }] }),
  component: BusinessHealth,
});

function BusinessHealth() {
  const { data: sales = [], isLoading: salesLoading } = useBizList<any>("sales", { order: "sale_date" });
  const { data: customers = [], isLoading: customersLoading } = useBizList<any>("customers", { order: "name" });
  const { data: products = [], isLoading: productsLoading } = useBizList<any>("products", { order: "name" });
  const { data: activities = [], isLoading: activitiesLoading } = useBizList<any>("customer_activities", { order: "created_at" });
  const { data: cashFlow = [], isLoading: cashLoading } = useBizList<any>("v_financial_cash_flow_daily", { order: "flow_date" });
  const { data: reconciliation = [], isLoading: reconciliationLoading } = useBizList<any>("v_financial_source_reconciliation");
  const loading = salesLoading || customersLoading || productsLoading || activitiesLoading || cashLoading || reconciliationLoading;

  const tasks = activities.filter((item: any) => item.type === "task");
  const openTasks = tasks.filter((item: any) => !item.completed).length;
  const overdueTasks = tasks.filter((item: any) => !item.completed && item.due_date && Number.isFinite(new Date(item.due_date).getTime()) && new Date(item.due_date).getTime() < Date.now()).length;

  const intelligence = useMemo(() => buildBusinessHealthIntelligence({
    sales,
    customers,
    products,
    activities,
    cashFlow,
    reconciliation,
  }), [sales, customers, products, activities, cashFlow, reconciliation]);

  return <ModuleGuard module="dashboard"><div className="p-4 md:p-6"><PageHeader title="Nüva Intelligence" description="Lectura ejecutiva basada en datos reales de operación, finanzas, clientes y ejecución." />{loading ? <div className="space-y-4"><Skeleton className="h-64 w-full" /><Card className="p-6"><Skeleton className="h-20 w-full" /></Card></div> : <div className="space-y-5"><BusinessHealthCard sales={sales.length} customers={customers.length} products={products.length} openTasks={openTasks} overdueTasks={overdueTasks} intelligence={intelligence} /><Card className="p-5"><p className="text-sm font-semibold">Cómo funciona Nüva Intelligence</p><p className="mt-1 text-sm leading-6 text-muted-foreground">El indicador combina señales observables de ventas, caja, calidad de datos, ejecución y controles. Es un indicador heurístico de gestión: no reemplaza estados financieros, asesoría profesional ni una predicción garantizada.</p></Card></div>}</div></ModuleGuard>;
}
