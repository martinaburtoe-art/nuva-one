import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Package,
  Users,
  Zap,
  FileText,
  ShieldAlert,
  Gauge,
  Target,
  History,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

type Customer = { id?: string; name?: string; status?: string | null };
type Sale = { customer_id?: string | null; total?: number | string | null; sale_date?: string | null };
type Activity = { customer_id?: string | null; type?: string | null; completed?: boolean | null; due_date?: string | null };
type Quote = { status?: string | null; total?: number | string | null };
type Product = { stock?: number | string | null; min_stock?: number | string | null };
type Props = {
  customers?: Customer[];
  sales?: Sale[];
  activities?: Activity[];
  quotes?: Quote[];
  products?: Product[];
  executionScore?: number;
};

const money = (value: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
const score = (value: number, target: number) => Math.max(0, Math.min(100, Math.round((value / Math.max(target, 1)) * 100)));
const healthLabel = (value: number) => value >= 80 ? "Saludable" : value >= 60 ? "Estable" : value >= 40 ? "Atención" : "Crítico";

export function NuvaExecutiveCommandCenter({ customers = [], sales = [], activities = [], quotes = [], products = [], executionScore = 0 }: Props) {
  const revenue = sales.reduce((sum, s) => sum + Number(s.total ?? 0), 0);
  const activeCustomers = customers.filter((c) => c.status !== "inactive").length;
  const tasks = activities.filter((a) => a.type === "task");
  const openTasks = tasks.filter((a) => !a.completed).length;
  const overdue = tasks.filter((a) => !a.completed && a.due_date && new Date(a.due_date).getTime() < Date.now()).length;
  const commercial = score(sales.length, 10);
  const customerHealth = score(activeCustomers, 10);
  const lowStock = products.filter((p) => Number(p.stock ?? 0) <= Number(p.min_stock ?? 0)).length;
  const inventory = products.length ? Math.max(0, Math.round(100 - (lowStock / products.length) * 100)) : 0;
  const execution = openTasks === 0 ? 100 : Math.max(0, Math.round(100 - (overdue / openTasks) * 100));
  const health = Math.round(commercial * 0.3 + customerHealth * 0.2 + inventory * 0.2 + execution * 0.3);
  const pendingQuotes = quotes.filter((q) => !["won", "lost", "cancelled"].includes(String(q.status ?? "").toLowerCase()));
  const pendingQuoteValue = pendingQuotes.reduce((sum, q) => sum + Number(q.total ?? 0), 0);
  const candidates = [
    { key: "overdue", label: "Resolver seguimientos vencidos", reason: `${overdue} seguimiento${overdue === 1 ? "" : "s"} vencido${overdue === 1 ? "" : "s"}`, impact: Math.min(100, 45 + overdue * 12), urgency: overdue > 0 ? 100 : 0 },
    { key: "quotes", label: "Priorizar cotizaciones abiertas", reason: `${pendingQuotes.length} cotización${pendingQuotes.length === 1 ? "" : "es"} abierta${pendingQuotes.length === 1 ? "" : "s"}`, impact: Math.min(100, pendingQuoteValue > 0 ? 55 + Math.log10(pendingQuoteValue + 1) * 4 : 0), urgency: pendingQuotes.length > 0 ? 65 : 0 },
    { key: "stock", label: "Revisar productos bajo mínimo", reason: `${lowStock} producto${lowStock === 1 ? "" : "s"} en nivel mínimo`, impact: Math.min(100, lowStock * 18), urgency: lowStock > 0 ? 75 : 0 },
  ].map((x) => ({ ...x, priority: Math.round(x.impact * 0.65 + x.urgency * 0.35) })).sort((a, b) => b.priority - a.priority);
  const best = candidates[0];
  const risk = best.priority >= 70;
  const urgency = best.key === "overdue" ? "Atención inmediata" : best.key === "stock" ? "Riesgo operativo" : best.key === "quotes" && best.priority > 0 ? "Oportunidad comercial" : openTasks > 0 ? "Mantén el foco" : "Operación bajo control";
  const diagnosis = best.key === "overdue" && overdue > 0
    ? `${best.reason}. La decisión se prioriza por urgencia y por su posible efecto sobre la continuidad comercial.`
    : best.key === "stock" && lowStock > 0
      ? `${best.reason}. La decisión se eleva porque comprometer ventas con stock bajo puede generar fricción operativa.`
      : best.key === "quotes" && pendingQuotes.length > 0
        ? `${best.reason} por ${money(pendingQuoteValue)}. La decisión se eleva por el valor comercial disponible.`
        : "No aparecen señales críticas suficientes para elevar una decisión urgente.";

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-background to-background">
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Zap className="h-4 w-4" /> Dirección ejecutiva</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">De la señal a una decisión con seguimiento.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Aquí no vuelves a leer el diagnóstico: eliges qué hacer, ejecutas la prioridad y después compruebas qué resultado produjo.</p>
            </div>
            <div className="min-w-36 rounded-2xl border bg-background/80 px-5 py-4 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Gauge className="h-3.5 w-3.5" /> Execution Score</div>
              <div className="mt-1 text-3xl font-bold tabular-nums">{executionScore}</div>
              <div className="text-xs font-medium">{executionScore >= 80 ? "Alta disciplina" : executionScore >= 60 ? "En seguimiento" : "Requiere foco"} · /100</div>
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={<Target className="h-4 w-4" />} label="Prioridad actual" value={`${best.priority}/100`} />
            <Metric icon={<CircleDollarSign className="h-4 w-4" />} label="Ventas registradas" value={money(revenue)} />
            <Metric icon={<Users className="h-4 w-4" />} label="Clientes activos" value={String(activeCustomers)} />
            <Metric icon={<History className="h-4 w-4" />} label="Tareas vencidas" value={String(overdue)} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Signal icon={<Package className="h-4 w-4" />} label="Preparación operativa" value={`${inventory}/100`} />
            <Signal icon={<FileText className="h-4 w-4" />} label="Pipeline que decidir" value={money(pendingQuoteValue)} />
            <Signal icon={<Gauge className="h-4 w-4" />} label="Salud de negocio" value={`${health}/100 · ${healthLabel(health)}`} />
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Decisión recomendada</p><h3 className="mt-1 text-xl font-semibold">{best.label}</h3></div>
              {risk ? <ShieldAlert className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5 text-primary" />}
            </div>
            <div className="mt-5 rounded-xl border bg-muted/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold">{diagnosis}</p><span className="rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums">Prioridad {best.priority}/100</span></div>
              <p className="mt-2 text-sm text-muted-foreground">La prioridad combina impacto y urgencia observables. El Centro Ejecutivo transforma la recomendación en una decisión gestionable.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/customer-action-center" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Ejecutar prioridad <ArrowUpRight className="h-4 w-4" /></Link>
              <Link to="/nuva-intelligence" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold">Volver al análisis <ArrowUpRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Resultado que buscamos</p>
            <h3 className="mt-2 text-lg font-semibold">Mover una prioridad, no acumular información.</h3>
            <div className="mt-4 space-y-3 text-sm">
              <Step icon={<Target className="h-4 w-4" />} title="Decidir" detail="Seleccionar una prioridad ejecutiva." />
              <Step icon={<Zap className="h-4 w-4" />} title="Ejecutar" detail="Llevarla al módulo operativo correspondiente." />
              <Step icon={<CheckCircle2 className="h-4 w-4" />} title="Medir" detail="Comprobar qué ocurrió después." />
              <Step icon={<History className="h-4 w-4" />} title="Aprender" detail="Conservar contexto para futuras decisiones." />
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function Step({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="flex items-start gap-3 rounded-xl border p-3"><div className="mt-0.5 rounded-lg bg-accent p-2">{icon}</div><div><p className="font-semibold">{title}</p><p className="text-xs leading-5 text-muted-foreground">{detail}</p></div></div>;
}
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border bg-background/70 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-1 text-lg font-bold tabular-nums">{value}</p></div>; }
function Signal({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-center justify-between rounded-xl border bg-background/60 px-4 py-3"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><span className="text-right font-semibold tabular-nums">{value}</span></div>; }
