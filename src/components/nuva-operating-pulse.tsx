import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle, ArrowUpRight, Boxes, CheckCircle2, Clock3, Users, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBizList } from "@/lib/biz-data";

type Product = { id: string; name: string | null; stock: number | null; low_stock_threshold: number | null; cost: number | null; price: number | null };
type Customer = { id: string; name: string; status: "lead" | "active" | "inactive"; pipeline_stage: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost"; last_contacted_at: string | null };
type Activity = { customer_id: string; type: string; due_date: string | null; completed: boolean };

type Signal = { title: string; detail: string; href: "/inventory" | "/customers" | "/finance" | "/billing"; tone: "critical" | "attention" | "positive" };

export function NuvaOperatingPulse() {
  const { data: products } = useBizList<Product>("products", { order: "created_at" });
  const { data: customers } = useBizList<Customer>("customers", { order: "name" });
  const { data: activities } = useBizList<Activity>("customer_activities", { order: "created_at", ascending: false });

  const inventory = useMemo(() => {
    const list = products ?? [];
    const critical = list.filter((p) => Number(p.stock ?? 0) <= 0);
    const low = list.filter((p) => Number(p.stock ?? 0) > 0 && Number(p.stock ?? 0) <= Number(p.low_stock_threshold ?? 0));
    const capital = list.reduce((sum, p) => sum + Math.max(0, Number(p.stock ?? 0)) * Math.max(0, Number(p.cost ?? 0)), 0);
    const potential = list.reduce((sum, p) => sum + Math.max(0, Number(p.stock ?? 0)) * Math.max(0, Number(p.price ?? 0)), 0);
    return { count: list.length, critical: critical.length, low: low.length, capital, potential };
  }, [products]);

  const crm = useMemo(() => {
    const list = customers ?? [];
    const openPipeline = list.filter((c) => ["new", "contacted", "qualified", "proposal"].includes(c.pipeline_stage)).length;
    const prospects = list.filter((c) => c.status === "lead").length;
    const stale = list.filter((c) => {
      if (!c.last_contacted_at) return c.status !== "inactive";
      return Date.now() - new Date(c.last_contacted_at).getTime() > 14 * 24 * 60 * 60 * 1000;
    }).length;
    const pendingTasks = (activities ?? []).filter((a) => !a.completed && a.due_date && new Date(a.due_date).getTime() <= Date.now()).length;
    return { total: list.length, openPipeline, prospects, stale, pendingTasks };
  }, [activities, customers]);

  const signals = useMemo<Signal[]>(() => {
    const result: Signal[] = [];
    if (inventory.critical) result.push({ title: "Riesgo de quiebre de stock", detail: `${inventory.critical} producto(s) están sin stock. Prioriza reposición para no perder ventas.`, href: "/inventory", tone: "critical" });
    else if (inventory.low) result.push({ title: "Reposición recomendada", detail: `${inventory.low} producto(s) están bajo su mínimo configurado.`, href: "/inventory", tone: "attention" });
    if (crm.pendingTasks) result.push({ title: "Tareas CRM vencidas", detail: `${crm.pendingTasks} seguimiento(s) requieren atención hoy.`, href: "/customers", tone: "attention" });
    if (crm.stale) result.push({ title: "Clientes sin contacto reciente", detail: `${crm.stale} cliente(s) llevan más de 14 días sin contacto registrado.`, href: "/customers", tone: "attention" });
    if (!result.length) result.push({ title: "Operación bajo control", detail: "No detectamos alertas críticas en inventario ni seguimiento comercial.", href: "/customers", tone: "positive" });
    return result.slice(0, 3);
  }, [crm, inventory]);

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-background via-primary/[0.025] to-background">
      <div className="border-b p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><WalletCards className="h-4 w-4" /> Nüva Operating Pulse</div>
            <h2 className="mt-1 text-lg font-semibold">Lo que requiere atención en tu negocio</h2>
            <p className="mt-1 text-sm text-muted-foreground">Una vista ejecutiva que conecta inventario, clientes y operación en señales accionables.</p>
          </div>
          <Badge variant="secondary" className="gap-1"><Clock3 className="h-3 w-3" /> Tiempo real del módulo</Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Boxes} label="Productos" value={inventory.count} />
          <Metric icon={AlertTriangle} label="Alertas stock" value={inventory.critical + inventory.low} critical={inventory.critical > 0} />
          <Metric icon={Users} label="Clientes" value={crm.total} />
          <Metric icon={CheckCircle2} label="Seguimientos" value={crm.pendingTasks} critical={crm.pendingTasks > 0} />
        </div>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-3 md:p-6">
        {signals.map((signal) => (
          <div key={signal.title} className="rounded-xl border bg-background/75 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className={`rounded-lg p-2 ${signal.tone === "critical" ? "bg-destructive/10 text-destructive" : signal.tone === "attention" ? "bg-amber-500/10 text-amber-600" : "bg-success/10 text-success"}`}>
                {signal.tone === "positive" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </div>
              <Badge variant={signal.tone === "critical" ? "destructive" : signal.tone === "attention" ? "secondary" : "outline"}>{signal.tone === "critical" ? "Crítico" : signal.tone === "attention" ? "Atención" : "OK"}</Badge>
            </div>
            <h3 className="mt-3 text-sm font-semibold">{signal.title}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{signal.detail}</p>
            <Link to={signal.href} className="mt-3 inline-flex items-center text-xs font-semibold text-primary">Resolver ahora <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-3 md:px-6">
        <p className="text-xs text-muted-foreground">Capital inventario a costo: <strong className="text-foreground">{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(inventory.capital)}</strong> · Valor potencial a precio: <strong className="text-foreground">{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(inventory.potential)}</strong></p>
        <Button asChild size="sm" variant="outline"><Link to="/customers">Abrir CRM <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
      </div>
    </Card>
  );
}

function Metric({ icon: Icon, label, value, critical }: { icon: typeof Boxes; label: string; value: number; critical?: boolean }) {
  return <div className="rounded-xl border bg-background/70 p-3"><div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${critical ? "text-destructive" : "text-primary"}`} /><span className="text-[11px] text-muted-foreground">{label}</span></div><p className="mt-1 text-xl font-bold">{value}</p></div>;
}
