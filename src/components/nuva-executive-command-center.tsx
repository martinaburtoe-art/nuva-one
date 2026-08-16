import { AlertTriangle, ArrowUpRight, CheckCircle2, CircleDollarSign, Package, Users, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

type Customer = { id?: string; name?: string; status?: string | null };
type Sale = { customer_id?: string | null; total?: number | string | null; sale_date?: string | null };
type Activity = { customer_id?: string | null; type?: string | null; completed?: boolean | null; due_date?: string | null };
type Quote = { status?: string | null; total?: number | string | null };

type Props = { customers?: Customer[]; sales?: Sale[]; activities?: Activity[]; quotes?: Quote[]; products?: unknown[]; executionScore?: number };

const money = (value: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
const score = (value: number, target: number) => Math.max(0, Math.min(100, Math.round((value / Math.max(target, 1)) * 100)));

export function NuvaExecutiveCommandCenter({ customers = [], sales = [], activities = [], quotes = [], products = [], executionScore = 0 }: Props) {
  const revenue = sales.reduce((sum, s) => sum + Number(s.total ?? 0), 0);
  const activeCustomers = customers.filter((c) => c.status !== "inactive").length;
  const tasks = activities.filter((a) => a.type === "task");
  const openTasks = tasks.filter((a) => !a.completed).length;
  const overdue = tasks.filter((a) => !a.completed && a.due_date && new Date(a.due_date).getTime() < Date.now()).length;
  const commercial = score(sales.length, 10);
  const customerHealth = score(activeCustomers, 10);
  const inventory = score(products.length, 20);
  const execution = openTasks === 0 ? 100 : Math.max(0, Math.round(100 - (overdue / openTasks) * 100));
  const health = Math.round(commercial * 0.3 + customerHealth * 0.2 + inventory * 0.2 + execution * 0.3);
  const urgency = overdue > 0 ? "Atención inmediata" : openTasks > 0 ? "Mantén el foco" : "Operación bajo control";
  const pendingQuotes = quotes.filter((q) => !["won", "lost", "cancelled"].includes(String(q.status ?? "").toLowerCase())).length;

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-background to-background">
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Zap className="h-4 w-4" /> Nüva Executive Intelligence</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Nüva encontró lo que merece tu atención.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Una lectura ejecutiva basada en señales disponibles del negocio: actividad comercial, cartera, inventario y ejecución.</p>
            </div>
            <div className="rounded-2xl border bg-background/80 px-5 py-4 text-center shadow-sm"><div className="text-xs text-muted-foreground">Business Health</div><div className="mt-1 text-3xl font-bold tabular-nums">{health}</div><div className="text-xs font-medium">/ 100</div></div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={<CircleDollarSign className="h-4 w-4" />} label="Ventas registradas" value={money(revenue)} />
            <Metric icon={<Users className="h-4 w-4" />} label="Clientes activos" value={String(activeCustomers)} />
            <Metric icon={<AlertTriangle className="h-4 w-4" />} label="Tareas vencidas" value={String(overdue)} />
            <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Execution Score" value={`${executionScore}/100`} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Signal icon={<Package className="h-4 w-4" />} label="Inventario" value={`${inventory}/100`} />
            <Signal icon={<ArrowUpRight className="h-4 w-4" />} label="Cotizaciones abiertas" value={String(pendingQuotes)} />
          </div>
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <Card><div className="p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Nüva Focus</p><h3 className="mt-1 text-xl font-semibold">{urgency}</h3></div><ArrowUpRight className="h-5 w-5 text-primary" /></div><div className="mt-5 rounded-xl border bg-muted/30 p-4"><p className="text-sm font-semibold">{overdue > 0 ? `Tienes ${overdue} seguimiento${overdue === 1 ? "" : "s"} vencido${overdue === 1 ? "" : "s"}.` : openTasks > 0 ? `Tienes ${openTasks} tarea${openTasks === 1 ? "" : "s"} abierta${openTasks === 1 ? "" : "s"} para ejecutar.` : "No hay tareas comerciales pendientes."}</p><p className="mt-1 text-sm text-muted-foreground">Nüva recomienda resolver primero las acciones con mayor impacto operativo.</p></div></div></Card>
        <Card><div className="p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Next Best Action</p><h3 className="mt-2 text-lg font-semibold">Ejecuta antes de analizar más.</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Convierte la señal de mayor impacto en una tarea desde el Action Center.</p><Link to="/customer-action-center" className="mt-4 inline-flex items-center text-sm font-semibold text-primary">Abrir Action Center <ArrowUpRight className="ml-1 h-4 w-4" /></Link></div></Card>
      </div>
      <div className="flex flex-wrap gap-2 text-sm"><Link to="/business-health" className="rounded-xl border px-4 py-2 font-semibold hover:bg-muted">Ver Business Health</Link><Link to="/customer-action-center" className="rounded-xl border px-4 py-2 font-semibold hover:bg-muted">Ver prioridades CRM</Link></div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border bg-background/70 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-1 text-lg font-bold tabular-nums">{value}</p></div>; }
function Signal({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-center justify-between rounded-xl border bg-background/60 px-4 py-3"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><span className="font-semibold tabular-nums">{value}</span></div>; }