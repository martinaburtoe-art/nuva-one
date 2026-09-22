import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { ModuleGuard } from "@/components/module-guard";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { useBizList } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/people-compliance")({ component: PeopleCompliance });

function PeopleCompliance() {
  const { data: items = [], isLoading } = useBizList<any>("people_compliance_items", { order: "due_date" });
  const { data: contracts = [] } = useBizList<any>("people_contracts", { order: "end_date" });
  const pending = items.filter((x: any) => !["compliant", "not_applicable"].includes(x.status));
  const expiring = contracts.filter((x: any) => x.end_date && x.status === "active" && (new Date(x.end_date).getTime() - Date.now()) / 86400000 <= 45).length;
  return <ModuleGuard module="people"><div className="p-4 md:p-6"><PageHeader title="Centro de cumplimiento" description="Obligaciones laborales, vencimientos y evidencias en un solo lugar." />
    <div className="grid gap-4 md:grid-cols-3"><Card className="rounded-2xl p-5"><ShieldAlert className="h-5 w-5" /><p className="mt-3 text-sm text-muted-foreground">Pendientes</p><p className="text-3xl font-semibold">{pending.length}</p></Card><Card className="rounded-2xl p-5"><p className="text-sm text-muted-foreground">Contratos por revisar</p><p className="mt-2 text-3xl font-semibold">{expiring}</p></Card><Card className="rounded-2xl p-5"><ShieldCheck className="h-5 w-5" /><p className="mt-3 text-sm text-muted-foreground">Modelo</p><p className="font-semibold">Trazable y versionado</p></Card></div>
    <Card className="mt-5 rounded-2xl p-5"><h2 className="font-semibold">Obligaciones</h2>{isLoading ? <p className="mt-4 text-sm text-muted-foreground">Cargando...</p> : <div className="mt-4 space-y-2">{pending.length === 0 ? <p className="text-sm text-muted-foreground">No hay alertas registradas.</p> : pending.map((item: any) => <div key={item.id} className="rounded-xl border p-3"><div className="flex justify-between gap-3"><span className="font-medium">{item.title}</span><span className="text-xs text-muted-foreground">{item.status}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.category}{item.due_date ? ` · vence ${item.due_date}` : ""}</p></div>)}</div>}</Card>
  </div></ModuleGuard>;
}
