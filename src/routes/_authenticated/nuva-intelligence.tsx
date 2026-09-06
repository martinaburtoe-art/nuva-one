import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, Brain, CheckCircle2, Lightbulb, ShieldAlert, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { useBizList } from "@/lib/biz-data";
import { ExplainMyBusiness } from "@/components/explain-my-business";

export const Route = createFileRoute("/_authenticated/nuva-intelligence")({
  head: () => ({ meta: [{ title: "Nüva Intelligence — Nüva One" }] }),
  component: NuvaIntelligence,
});

type View = "read" | "signals" | "opportunities" | "explain";

const views: Array<{ id: View; title: string; description: string }> = [
  { id: "read", title: "Lectura", description: "Qué significan tus datos" },
  { id: "signals", title: "Señales", description: "Riesgos, anomalías y cambios" },
  { id: "opportunities", title: "Oportunidades", description: "Dónde existe potencial" },
  { id: "explain", title: "Explícame", description: "Por qué Nüva llega a esta lectura" },
];

function NuvaIntelligence() {
  const [activeView, setActiveView] = useState<View>("read");
  const { data: sales } = useBizList<any>("sales", { order: "sale_date" });
  const { data: transactions } = useBizList<any>("transactions", { order: "tx_date" });
  const { data: products } = useBizList<any>("products", { order: "name" });
  const { data: quotes } = useBizList<any>("quotes", { order: "created_at" });
  const { data: activities } = useBizList<any>("customer_activities", { order: "created_at" });

  const intelligence = useMemo(() => {
    const income = (transactions ?? []).filter((t: any) => t.type === "income").reduce((sum: number, t: any) => sum + Number(t.amount ?? 0), 0);
    const expense = (transactions ?? []).filter((t: any) => t.type === "expense").reduce((sum: number, t: any) => sum + Number(t.amount ?? 0), 0);
    const lowStock = (products ?? []).filter((p: any) => Number(p.stock ?? 0) <= Number(p.min_stock ?? p.low_stock_threshold ?? 0)).length;
    const overdue = (activities ?? []).filter((a: any) => a.type === "task" && !a.completed && a.due_date && new Date(a.due_date).getTime() < Date.now()).length;
    const openQuotes = (quotes ?? []).filter((q: any) => !["won", "lost", "cancelled"].includes(String(q.status ?? "").toLowerCase()));
    const openPipeline = openQuotes.reduce((sum: number, q: any) => sum + Number(q.total ?? 0), 0);
    const net = income - expense;
    const margin = income > 0 ? Math.round((net / income) * 1000) / 10 : 0;
    const health = Math.max(0, Math.min(100, Math.round(60 + (margin > 0 ? Math.min(25, margin / 4) : -15) - lowStock * 4 - overdue * 5)));
    const signals = lowStock + overdue + (margin < 0 ? 1 : 0);
    return { income, expense, net, margin, lowStock, overdue, openQuotes: openQuotes.length, openPipeline, health, signals, salesCount: (sales ?? []).length, productsCount: (products ?? []).length };
  }, [activities, products, quotes, sales, transactions]);

  const money = (value: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);

  return (
    <ModuleGuard module="dashboard">
      <div className="space-y-6">
        <PageHeader title="Nüva Intelligence" description="El analista de Nüva: interpreta datos, detecta patrones y explica qué está cambiando en tu negocio. No ejecuta operaciones." />

        <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/[0.07] via-background to-background p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400"><Brain className="h-4 w-4" /> Capa analítica</div>
            <span className="rounded-full border bg-background/80 px-3 py-1 text-xs font-medium">Pregunta aquí: ¿qué significa?</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {views.map((view) => {
              const active = activeView === view.id;
              return <button key={view.id} type="button" aria-pressed={active} onClick={() => setActiveView(view.id)} className={`rounded-2xl border p-4 text-left transition-all ${active ? "border-violet-500/50 bg-violet-500/[0.08] shadow-sm" : "bg-background/70 hover:-translate-y-0.5 hover:border-violet-500/40"}`}><p className="font-semibold">{view.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{view.description}</p></button>;
            })}
          </div>
        </Card>

        {activeView === "read" && (
          <div className="space-y-5">
            <Card className="overflow-hidden border-violet-500/20">
              <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">Interpretación</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{intelligence.signals > 0 ? "Nüva detecta cambios que vale la pena entender." : "Nüva no detecta señales críticas con los datos actuales."}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">Esta pantalla no te pide registrar nada. Cruza caja, ventas, inventario, cotizaciones y seguimiento para explicar dónde está el cambio, qué puede significar y qué evidencia lo sostiene.</p>
                </div>
                <div className="min-w-[150px] rounded-2xl border bg-background/80 p-5 text-center"><p className="text-xs text-muted-foreground">Índice analítico</p><p className="mt-1 text-3xl font-bold tabular-nums">{intelligence.health}</p><p className="text-xs">/100</p></div>
              </div>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Flujo neto" value={money(intelligence.net)} />
              <Kpi label="Margen" value={`${intelligence.margin}%`} />
              <Kpi label="Señales" value={String(intelligence.signals)} />
              <Kpi label="Pipeline" value={money(intelligence.openPipeline)} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <InsightTile title="Lo que observa" value={`${intelligence.lowStock} riesgos de stock`} detail="La disponibilidad está bajo presión cuando el stock alcanza sus mínimos configurados." href="/inventory" />
              <InsightTile title="Lo que significa" value={`${intelligence.openQuotes} cotizaciones abiertas`} detail={`Existe un pipeline potencial de ${money(intelligence.openPipeline)} que merece interpretación comercial.`} href="/quotes" />
              <InsightTile title="Lo que explica" value={`${intelligence.overdue} seguimientos vencidos`} detail="Los atrasos comerciales pueden explicar parte de la pérdida de conversión." href="/customers" />
            </div>
          </div>
        )}

        {activeView === "signals" && (
          <div className="space-y-4">
            <SectionIntro title="Señales detectadas" text="Aquí no se ejecutan tareas: se entiende la evidencia detrás de cada señal." />
            <div className="grid gap-5 md:grid-cols-2">
              <SignalCard icon={<ShieldAlert className="h-5 w-5" />} title="Presión de inventario" value={intelligence.lowStock} description="Productos en o bajo su mínimo configurado." href="/inventory" />
              <SignalCard icon={<AlertTriangle className="h-5 w-5" />} title="Fricción comercial" value={intelligence.overdue} description="Seguimientos vencidos que pueden afectar conversión." href="/customers" />
              <SignalCard icon={<CheckCircle2 className="h-5 w-5" />} title="Demanda potencial" value={intelligence.openQuotes} description={`Cotizaciones abiertas por ${money(intelligence.openPipeline)}.`} href="/quotes" />
              <SignalCard icon={<Sparkles className="h-5 w-5" />} title="Resultado financiero" value={`${intelligence.margin}%`} description="Margen estimado sobre los movimientos registrados." href="/finance" />
            </div>
          </div>
        )}

        {activeView === "opportunities" && (
          <Card className="border-violet-500/20 p-6 md:p-8">
            <div className="flex items-start gap-4"><Lightbulb className="mt-1 h-6 w-6 text-violet-600 dark:text-violet-400" /><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">Potencial detectado</p><h2 className="mt-1 text-xl font-semibold">{intelligence.openQuotes > 0 ? "El pipeline contiene una oportunidad de conversión." : "Nüva necesita más evidencia para detectar oportunidades."}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{intelligence.openQuotes > 0 ? `Nüva identifica ${intelligence.openQuotes} cotizaciones abiertas por ${money(intelligence.openPipeline)}. La oportunidad no es una orden automática: es una hipótesis que debes evaluar.` : "Registra más ventas, gastos, productos y clientes para que el análisis gane profundidad."}</p></div></div>
          </Card>
        )}

        {activeView === "explain" && <ExplainMyBusiness />}
      </div>
    </ModuleGuard>
  );
}

function SectionIntro({ title, text }: { title: string; text: string }) { return <div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>; }
function Kpi({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border bg-background/70 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold tabular-nums">{value}</p></div>; }
function InsightTile({ title, value, detail, href }: { title: string; value: string; detail: string; href: "/inventory" | "/quotes" | "/customers" }) { return <Link to={href} className="block rounded-2xl"><Card className="h-full border-violet-500/10 p-5 transition-all hover:-translate-y-0.5 hover:border-violet-500/30"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p><p className="mt-2 text-lg font-semibold">{value}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400">Ver evidencia <ArrowUpRight className="h-3.5 w-3.5" /></span></Card></Link>; }
function SignalCard({ icon, title, value, description, href }: { icon: React.ReactNode; title: string; value: number | string; description: string; href: "/inventory" | "/customers" | "/quotes" | "/finance" }) { return <Link to={href} className="block rounded-2xl"><Card className="h-full p-6 transition-all hover:-translate-y-0.5 hover:border-violet-500/30"><div className="flex items-start gap-3"><div className="rounded-xl border bg-violet-500/[0.08] p-2 text-violet-600 dark:text-violet-400">{icon}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400">Ver evidencia <ArrowUpRight className="h-3.5 w-3.5" /></span></div></div></Card></Link>; }
