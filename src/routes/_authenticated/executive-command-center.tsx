import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/executive-command-center")({
  head: () => ({ meta: [{ title: "Executive Intelligence — Nüva One" }] }),
  component: ExecutiveCommandCenter,
});

function ExecutiveCommandCenter() {
  const { data: customers, isLoading: a } = useBizList<any>("customers", { order: "name" });
  const { data: sales, isLoading: b } = useBizList<any>("sales", { order: "sale_date" });
  const { data: activities, isLoading: c } = useBizList<any>("customer_activities", { order: "created_at" });
  const { data: quotes, isLoading: d } = useBizList<any>("quotes", { order: "created_at" });
  const { data: products, isLoading: e } = useBizList<any>("products", { order: "name" });
  const loading = a || b || c || d || e;
  const tasks = (activities ?? []).filter((x: any) => x.type === "task");
  const completed = tasks.filter((x: any) => x.completed).length;
  const executionScore = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  return <ModuleGuard module="customers"><div className="p-4 md:p-6"><PageHeader title="Executive Intelligence" description="La vista ejecutiva de Nüva: qué está pasando, qué importa y qué hacer ahora." />{loading ? <div className="space-y-4"><Skeleton className="h-56 w-full" /><Skeleton className="h-40 w-full" /></div> : <div className="space-y-5"><NuvaExecutiveCommandCenter customers={customers ?? []} sales={sales ?? []} activities={activities ?? []} quotes={quotes ?? []} products={products ?? []} executionScore={executionScore} /><NuvaDecisionTimeline activities={activities ?? []} /><NuvaPredictiveSignals sales={sales ?? []} quotes={quotes ?? []} activities={activities ?? []} /><NuvaTrendIntelligence sales={sales ?? []} activities={activities ?? []} quotes={quotes ?? []} /><NuvaDecisionOutcomes activities={activities ?? []} /><NuvaDecisionMemory activities={activities ?? []} /><NuvaExecutionScore activities={activities ?? []} priorities={(customers ?? []).length} /></div>}</div></ModuleGuard>;
}