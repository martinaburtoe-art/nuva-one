import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
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
import { AlertTriangle, CheckCircle2, Lightbulb, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/executive-command-center")({
  head: () => ({ meta: [{ title: "Executive Intelligence — Nüva One" }] }),
  component: ExecutiveCommandCenter,
});

function ExecutiveCommandCenter() {
  const { data: customers, isLoading: a } = useBizList<any>("customers", { order: "name" });
  const { data: sales, isLoading: b } = useBizList<any>("sales", { order: "sale_date" });
  const { data: activities, isLoading: c } = useBizList<any>("customer_activities", {
    order: "created_at",
  });
  const { data: quotes, isLoading: d } = useBizList<any>("quotes", { order: "created_at" });
  const { data: products, isLoading: e } = useBizList<any>("products", { order: "name" });
  const { data: purchases, isLoading: f } = useBizList<any>("purchases", {
    order: "purchase_date",
  });
  const { data: transactions, isLoading: g } = useBizList<any>("transactions", {
    order: "tx_date",
  });
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

  return (
    <ModuleGuard module="customers">
      <div className="p-4 md:p-6">
        <PageHeader
          title="Executive Intelligence"
          description="La vista ejecutiva de Nüva: qué está pasando, qué importa y qué hacer ahora."
        />
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            {decision && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-accent/20 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Nüva Decision Engine
                    </p>
                    <h2 className="mt-1 text-xl font-bold">{decision.headline}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Prioridad ejecutiva:{" "}
                      <strong className="text-foreground">{decision.score}/100</strong> · Estado:{" "}
                      <strong className="text-foreground">{decision.status}</strong>
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
                      to={item.destination === "/crm" ? "/customers" : item.destination}
                      className="rounded-xl border bg-background/70 p-4 transition-all hover:-translate-y-0.5 hover:border-primary"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Impacto {item.impact}/100 ·{" "}
                            {item.mode === "prepare" ? "Preparar" : "Revisar"}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-primary">{item.cta} →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
            <NuvaExecutiveCommandCenter
              customers={customers ?? []}
              sales={sales ?? []}
              activities={activities ?? []}
              quotes={quotes ?? []}
              products={products ?? []}
              executionScore={executionScore}
            />
            <NuvaDecisionTimeline activities={activities ?? []} />
            <NuvaPredictiveSignals
              sales={sales ?? []}
              quotes={quotes ?? []}
              activities={activities ?? []}
            />
            <NuvaTrendIntelligence
              sales={sales ?? []}
              activities={activities ?? []}
              quotes={quotes ?? []}
            />
            <NuvaDecisionOutcomes activities={activities ?? []} />
            <NuvaDecisionMemory activities={activities ?? []} />
            <NuvaExecutionScore
              activities={activities ?? []}
              priorities={(customers ?? []).length}
            />
          </div>
        )}
      </div>
    </ModuleGuard>
  );
}

function DecisionIcon({ status }: { status: "critical" | "attention" | "opportunity" | "stable" }) {
  if (status === "critical") return <ShieldAlert className="h-4 w-4" />;
  if (status === "attention") return <AlertTriangle className="h-4 w-4" />;
  if (status === "opportunity") return <Lightbulb className="h-4 w-4" />;
  return <CheckCircle2 className="h-4 w-4" />;
}
