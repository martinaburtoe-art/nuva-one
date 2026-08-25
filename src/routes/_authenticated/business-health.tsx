import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useBizList } from "@/lib/biz-data";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { BusinessHealthCard } from "@/components/executive/business-health-card";
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
  const overdueTasks = tasks.filter((item: any) => !item.completed && item.due_date && new Date(item.due_date).getTime() < Date.now()).length;

  const intelligence = useMemo(() => {
    const now = Date.now();
    const day = 86_400_000;
    const validSales = sales.filter((s: any) => s.status !== "cancelled" && s.status !== "draft");
    const current30 = validSales.filter((s: any) => now - new Date(s.sale_date).getTime() <= 30 * day).reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);
    const previous30 = validSales.filter((s: any) => {
      const age = now - new Date(s.sale_date).getTime();
      return age > 30 * day && age <= 60 * day;
    }).reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);
    const momentum = previous30 > 0 ? Math.max(0, Math.min(100, Math.round(50 + ((current30 - previous30) / previous30) * 50))) : current30 > 0 ? 75 : 50;
    const recentCash = cashFlow.filter((r: any) => now - new Date(r.flow_date).getTime() <= 30 * day).reduce((sum: number, r: any) => sum + Number(r.net_cash || 0), 0);
    const liquidity = recentCash > 0 ? 80 : recentCash < 0 ? 25 : 50;
    const customerData = customers.length ? customers.reduce((sum: number, c: any) => sum + [c.name, c.phone, c.email].filter(Boolean).length / 3, 0) / customers.length : 0;
    const productData = products.length ? products.reduce((sum: number, p: any) => sum + [p.name, p.price, p.cost, p.stock].filter((v: any) => v !== null && v !== undefined && v !== "").length / 4, 0) / products.length : 0;
    const dataReadiness = Math.round((customerData * 0.45 + productData * 0.55) * 100);
    const execution = openTasks === 0 ? 100 : Math.max(0, Math.round(100 - (overdueTasks / Math.max(openTasks, 1)) * 100));
    const reconciliationOpen = reconciliation.filter((r: any) => !["reconciled", "posted"].includes(r.status)).length;
    const controls = Math.max(0, 100 - Math.min(70, reconciliationOpen * 10));
    const health = Math.round(momentum * 0.25 + liquidity * 0.2 + dataReadiness * 0.2 + execution * 0.2 + controls * 0.15);
    return { health, momentum, liquidity, dataReadiness, execution, controls, current30, previous30, recentCash, reconciliationOpen };
  }, [sales, cashFlow, customers, products, openTasks, overdueTasks, reconciliation]);

  return <ModuleGuard module="dashboard"><div className="p-4 md:p-6"><PageHeader title="Nüva Intelligence" description="Lectura ejecutiva basada en datos reales de operación, finanzas, clientes y ejecución." />{loading ? <div className="space-y-4"><Skeleton className="h-64 w-full" /><Card className="p-6"><Skeleton className="h-20 w-full" /></Card></div> : <div className="space-y-5"><BusinessHealthCard sales={sales.length} customers={customers.length} products={products.length} openTasks={openTasks} overdueTasks={overdueTasks} intelligence={intelligence} /><Card className="p-5"><p className="text-sm font-semibold">Cómo funciona Nüva Intelligence</p><p className="mt-1 text-sm leading-6 text-muted-foreground">El indicador combina señales observables de ventas, caja, calidad de datos, ejecución y controles. Es un indicador heurístico de gestión: no reemplaza estados financieros, asesoría profesional ni una predicción garantizada.</p></Card></div>}</div></ModuleGuard>;
}
