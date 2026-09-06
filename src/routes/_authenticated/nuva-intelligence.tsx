import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, Brain, CheckCircle2, Lightbulb, ShieldAlert, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { useBizList } from "@/lib/biz-data";
import { NuvaScoreCard } from "@/components/nuva-score-card";
import { ExplainMyBusiness } from "@/components/explain-my-business";
import { NuvaActionCenter } from "@/components/nuva-action-center";
import { BusinessInsightCard } from "@/components/business-insight-card";

export const Route = createFileRoute("/_authenticated/nuva-intelligence")({
  head: () => ({ meta: [{ title: "Nüva Intelligence — Nüva One" }] }),
  component: NuvaIntelligence,
});

type View = "pulse" | "signals" | "opportunities" | "actions" | "explain";

const views: Array<{ id: View; title: string; description: string }> = [
  { id: "pulse", title: "Pulse", description: "Lectura inteligente del negocio" },
  { id: "signals", title: "Señales", description: "Riesgos, anomalías y cambios" },
  { id: "opportunities", title: "Oportunidades", description: "Dónde Nüva ve potencial" },
  { id: "actions", title: "Acciones", description: "Qué conviene ejecutar ahora" },
  { id: "explain", title: "Explícame", description: "Entender el negocio con contexto" },
];

function NuvaIntelligence() {
  const [activeView, setActiveView] = useState<View>("pulse");
  const { data: sales } = useBizList<any>("sales", { order: "sale_date" });
  const { data: transactions } = useBizList<any>("transactions", { order: "tx_date" });
  const { data: products } = useBizList<any>("products", { order: "name" });
  const { data: customers } = useBizList<any>("customers", { order: "name" });
  const { data: quotes } = useBizList<any>("quotes", { order: "created_at" });
  const { data: activities } = useBizList<any>("customer_activities", { order: "created_at" });

  const intelligence = useMemo(() => {
    const income = (transactions ?? [])
      .filter((t: any) => t.type === "income")
      .reduce((sum: number, t: any) => sum + Number(t.amount ?? 0), 0);
    const expense = (transactions ?? [])
      .filter((t: any) => t.type === "expense")
      .reduce((sum: number, t: any) => sum + Number(t.amount ?? 0), 0);
    const lowStock = (products ?? []).filter(
      (p: any) => Number(p.stock ?? 0) <= Number(p.min_stock ?? p.low_stock_threshold ?? 0),
    ).length;
    const overdue = (activities ?? []).filter(
      (a: any) => a.type === "task" && !a.completed && a.due_date && new Date(a.due_date).getTime() < Date.now(),
    ).length;
    const openQuotes = (quotes ?? []).filter(
      (q: any) => !["won", "lost", "cancelled"].includes(String(q.status ?? "").toLowerCase()),
    );
    const openPipeline = openQuotes.reduce((sum: number, q: any) => sum + Number(q.total ?? 0), 0);
    const net = income - expense;
    const margin = income > 0 ? Math.round((net / income) * 1000) / 10 : 0;
    const critical = overdue > 0 || lowStock > 0;
    const health = Math.max(
      0,
      Math.min(100, Math.round(60 + (margin > 0 ? Math.min(25, margin / 4) : -15) - lowStock * 4 - overdue * 5)),
    );
    return { income, expense, net, margin, lowStock, overdue, openQuotes: openQuotes.length, openPipeline, critical, health };
  }, [transactions, products, activities, quotes]);

  const money = (value: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);

  return (
    <ModuleGuard module="dashboard">
      <div className="space-y-6">
        <PageHeader
          title="Nüva Intelligence"
          description="El cerebro analítico de Nüva: convierte los datos del negocio en señales, oportunidades y acciones."
        />

        <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.08] via-background to-accent/20 p-4 md:p-5">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {views.map((view) => {
              const active = activeView === view.id;
              return (
                <button
                  key={view.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveView(view.id)}
                  className={`rounded-2xl border p-4 text-left transition-all ${active ? "border-primary bg-primary/[0.08] shadow-sm" : "bg-background/70 hover:-translate-y-0.5 hover:border-primary"}`}
                >
                  <p className="font-semibold">{view.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{view.description}</p>
                </button>
              );
            })}
          </div>
        </Card>

        {activeView === "pulse" && (
          <div className="space-y-5">
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.09] via-background to-background">
              <div className="p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      <Brain className="h-4 w-4" /> Lectura de Nüva
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                      {intelligence.critical ? "Hay señales que merecen atención." : "El negocio mantiene una operación estable."}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Nüva cruza caja, ventas, inventario, clientes, cotizaciones y actividad para priorizar lo que realmente importa.
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-background/80 px-5 py-4 text-center">
                    <p className="text-xs text-muted-foreground">Intelligence Health</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums">{intelligence.health}</p>
                    <p className="text-xs font-medium">/100</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Kpi label="Flujo neto" value={money(intelligence.net)} />
                  <Kpi label="Margen" value={`${intelligence.margin}%`} />
                  <Kpi label="Alertas operativas" value={String(intelligence.lowStock + intelligence.overdue)} />
                  <Kpi label="Pipeline abierto" value={money(intelligence.openPipeline)} />
                </div>
              </div>
            </Card>
            <BusinessInsightCard
              income={intelligence.income}
              expense={intelligence.expense}
              inventoryValue={(products ?? []).reduce((s: number, p: any) => s + Number(p.stock ?? 0) * Number(p.price ?? 0), 0)}
              productsCount={(products ?? []).length}
              salesCount={(sales ?? []).length}
            />
          </div>
        )}

        {activeView === "signals" && (
          <div className="grid gap-5 md:grid-cols-2">
            <SignalCard icon={<ShieldAlert className="h-5 w-5" />} title="Riesgos operativos" value={intelligence.lowStock} description="Productos en o bajo su mínimo configurado." />
            <SignalCard icon={<AlertTriangle className="h-5 w-5" />} title="Seguimientos vencidos" value={intelligence.overdue} description="Tareas comerciales que requieren atención." />
            <SignalCard icon={<CheckCircle2 className="h-5 w-5" />} title="Cotizaciones abiertas" value={intelligence.openQuotes} description={`Pipeline potencial de ${money(intelligence.openPipeline)}.`} />
            <SignalCard icon={<Sparkles className="h-5 w-5" />} title="Lectura financiera" value={`${intelligence.margin}%`} description="Margen estimado sobre los movimientos registrados." />
          </div>
        )}

        {activeView === "opportunities" && (
          <Card className="p-6 md:p-8">
            <div className="flex items-start gap-3">
              <Lightbulb className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Oportunidad prioritaria</p>
                <h2 className="mt-1 text-xl font-semibold">
                  {intelligence.openQuotes > 0 ? "Convierte el pipeline abierto en seguimiento comercial." : "Construye señales con más datos operativos."}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {intelligence.openQuotes > 0
                    ? `Hay ${intelligence.openQuotes} cotizaciones abiertas por ${money(intelligence.openPipeline)}. El siguiente paso es priorizar aquellas con mayor valor y antigüedad.`
                    : "A medida que registres ventas, gastos, productos y clientes, Nüva aumentará la precisión de sus recomendaciones."}
                </p>
              </div>
            </div>
          </Card>
        )}

        {activeView === "actions" && <NuvaActionCenter />}
        {activeView === "explain" && <ExplainMyBusiness />}
      </div>
    </ModuleGuard>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-background/70 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold tabular-nums">{value}</p></div>;
}

function SignalCard({ icon, title, value, description }: { icon: React.ReactNode; title: string; value: number | string; description: string }) {
  return <Card className="p-6"><div className="flex items-start gap-3"><div className="rounded-xl border bg-accent p-2">{icon}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></div></Card>;
}
