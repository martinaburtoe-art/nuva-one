import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBizList } from "@/lib/biz-data";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { NuvaExecutiveCommandCenter } from "@/components/nuva-executive-command-center";
import { NuvaExecutionScore } from "@/components/nuva-execution-score";
import { NuvaTrendIntelligence } from "@/components/nuva-trend-intelligence";
import { NuvaPredictiveSignals } from "@/components/nuva-predictive-signals";
import { NuvaDecisionOutcomes } from "@/components/nuva-decision-outcomes";
import { NuvaDecisionMemory } from "@/components/nuva-decision-memory";
import { NuvaDecisionTimeline } from "@/components/nuva-decision-timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { buildNuvaDecision } from "@/lib/nuva-decision-engine";
import type { ActionDestination } from "@/lib/nuva-action-center";
import { AlertTriangle, CheckCircle2, Lightbulb, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/executive-command-center")({
  head: () => ({ meta: [{ title: "Executive Intelligence — Nüva One" }] }),
  component: ExecutiveCommandCenter,
});

type IntelligenceSection =
  | "overview"
  | "decision"
  | "timeline"
  | "predictive"
  | "trends"
  | "outcomes"
  | "memory"
  | "execution";

const intelligenceSections: Array<{
  id: IntelligenceSection;
  title: string;
  description: string;
}> = [
  { id: "overview", title: "Resumen ejecutivo", description: "Salud, señales y foco actual" },
  { id: "decision", title: "Decision Engine", description: "Prioridades y acciones recomendadas" },
  { id: "timeline", title: "Timeline", description: "Evolución de decisiones y actividad" },
  { id: "predictive", title: "Predictivo", description: "Riesgos y señales anticipadas" },
  { id: "trends", title: "Tendencias", description: "Cambios comerciales y operativos" },
  { id: "outcomes", title: "Resultados", description: "Qué ocurrió después de decidir" },
  { id: "memory", title: "Memoria", description: "Contexto y aprendizaje del negocio" },
  { id: "execution", title: "Execution Score", description: "Disciplina y cumplimiento" },
];

function ExecutiveCommandCenter() {
  const [activeSection, setActiveSection] = useState<IntelligenceSection>("overview");
  const { data: customers, isLoading: a } = useBizList<any>("customers", { order: "name" });
  const { data: sales, isLoading: b } = useBizList<any>("sales", { order: "sale_date" });
  const { data: activities, isLoading: c } = useBizList<any>("customer_activities", { order: "created_at" });
  const { data: quotes, isLoading: d } = useBizList<any>("quotes", { order: "created_at" });
  const { data: products, isLoading: e } = useBizList<any>("products", { order: "name" });
  const { data: purchases, isLoading: f } = useBizList<any>("purchases", { order: "purchase_date" });
  const { data: transactions, isLoading: g } = useBizList<any>("transactions", { order: "tx_date" });
  const loading = a || b || c || d || e || f || g;
  const tasks = (activities ?? []).filter((x: any) => x.type === "task");
  const completed = tasks.filter((x: any) => x.completed).length;
  const executionScore = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const decision = useMemo(() => {
    if (loading) return null;
    return buildNuvaDecision({
      sales: sales ?? [],
      purchases: purchases ?? [],
      transactions: transactions ?? [],
      stock: (products ?? []).map((p: any) => ({ ...p, quantity: p.stock })),
    });
  }, [loading, sales, purchases, transactions, products]);

  const section = intelligenceSections.find((item) => item.id === activeSection)!;

  return (
    <ModuleGuard module="customers">
      <div className="p-4 md:p-6">
        <PageHeader
          title="Executive Intelligence"
          description="La vista ejecutiva de Nüva: qué está pasando, qué importa y qué hacer ahora."
        />
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <Card className="border-primary/20 bg-background/70 p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {intelligenceSections.map((item) => {
                  const active = item.id === activeSection;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setActiveSection(item.id)}
                      className={`group rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? "border-primary bg-primary/[0.07] shadow-sm"
                          : "bg-background/70 hover:-translate-y-0.5 hover:border-primary hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                        </div>
                        <Arrow active={active} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <div className="flex items-center justify-between gap-3 border-b pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Executive workspace</p>
                <h2 className="mt-1 text-xl font-semibold">{section.title}</h2>
              </div>
              <span className="hidden text-xs text-muted-foreground md:block">Vista {intelligenceSections.findIndex((item) => item.id === activeSection) + 1} de {intelligenceSections.length}</span>
            </div>

            {activeSection === "overview" && (
              <NuvaExecutiveCommandCenter
                customers={customers ?? []}
                sales={sales ?? []}
                activities={activities ?? []}
                quotes={quotes ?? []}
                products={products ?? []}
                executionScore={executionScore}
              />
            )}

            {activeSection === "decision" && decision && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-accent/20 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Nüva Decision Engine</p>
                    <h2 className="mt-1 text-xl font-bold">{decision.headline}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Prioridad ejecutiva: <strong className="text-foreground">{decision.score}/100</strong> · Estado: <strong className="text-foreground">{decision.status}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold">
                    <DecisionIcon status={decision.status} /> {decision.topSignal.title}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {decision.actions.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      to={decisionDestinationRoute(item.destination)}
                      className="rounded-xl border bg-background/70 p-4 transition-all hover:-translate-y-0.5 hover:border-primary"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Impacto {item.impact}/100 · {item.mode === "prepare" ? "Preparar" : "Revisar"}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-primary">{item.cta} →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            {activeSection === "timeline" && <NuvaDecisionTimeline activities={activities ?? []} />}
            {activeSection === "predictive" && <NuvaPredictiveSignals sales={sales ?? []} quotes={quotes ?? []} activities={activities ?? []} />}
            {activeSection === "trends" && <NuvaTrendIntelligence sales={sales ?? []} activities={activities ?? []} quotes={quotes ?? []} />}
            {activeSection === "outcomes" && <NuvaDecisionOutcomes activities={activities ?? []} />}
            {activeSection === "memory" && <NuvaDecisionMemory activities={activities ?? []} />}
            {activeSection === "execution" && <NuvaExecutionScore activities={activities ?? []} priorities={(customers ?? []).length} />}
          </div>
        )}
      </div>
    </ModuleGuard>
  );
}

function Arrow({ active }: { active: boolean }) {
  return (
    <span
      className={`text-sm font-semibold transition-transform ${
        active ? "text-primary" : "text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary"
      }`}
      aria-hidden="true"
    >
      {active ? "●" : "→"}
    </span>
  );
}

function decisionDestinationRoute(destination: ActionDestination) {
  switch (destination) {
    case "inventory": return "/inventory";
    case "crm": return "/customers";
    case "purchases": return "/purchases";
    case "finance": return "/finance";
    case "customers": return "/customers";
    case "dashboard": return "/dashboard";
  }
}

function DecisionIcon({ status }: { status: "critical" | "attention" | "opportunity" | "stable" }) {
  if (status === "critical") return <ShieldAlert className="h-4 w-4" />;
  if (status === "attention") return <AlertTriangle className="h-4 w-4" />;
  if (status === "opportunity") return <Lightbulb className="h-4 w-4" />;
  return <CheckCircle2 className="h-4 w-4" />;
}
