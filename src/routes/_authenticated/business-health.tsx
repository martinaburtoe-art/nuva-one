import { createFileRoute } from "@tanstack/react-router";
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
  const { data: sales, isLoading: salesLoading } = useBizList<any>("sales", { order: "sale_date" });
  const { data: customers, isLoading: customersLoading } = useBizList<any>("customers", { order: "name" });
  const { data: products, isLoading: productsLoading } = useBizList<any>("products", { order: "name" });
  const { data: activities, isLoading: activitiesLoading } = useBizList<any>("customer_activities", { order: "created_at" });
  const loading = salesLoading || customersLoading || productsLoading || activitiesLoading;
  const tasks = (activities ?? []).filter((item: any) => item.type === "task");
  const openTasks = tasks.filter((item: any) => !item.completed).length;
  const overdueTasks = tasks.filter((item: any) => !item.completed && item.due_date && new Date(item.due_date).getTime() < Date.now()).length;

  return <ModuleGuard module="dashboard"><div className="p-4 md:p-6"><PageHeader title="Business Health" description="La lectura ejecutiva de Nüva sobre la salud operativa de tu negocio." />{loading ? <div className="space-y-4"><Skeleton className="h-64 w-full" /><Card className="p-6"><Skeleton className="h-20 w-full" /></Card></div> : <div className="space-y-5"><BusinessHealthCard sales={(sales ?? []).length} customers={(customers ?? []).length} products={(products ?? []).length} openTasks={openTasks} overdueTasks={overdueTasks} /><Card className="p-5"><p className="text-sm font-semibold">Cómo leer este indicador</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Business Health resume señales operativas disponibles en Nüva. No sustituye el Nüva Score financiero: esta capa prioriza actividad comercial, cartera, inventario y ejecución.</p></Card></div>}</div></ModuleGuard>;
}
