import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
const FinanceAccountingWorkspaceV2 = lazy(() => import("@/components/finance-accounting-workspace-v2").then((m) => ({ default: m.FinanceAccountingWorkspaceV2 })));
const FinanceAdvancedTools = lazy(() => import("@/components/finance-advanced-tools").then((m) => ({ default: m.FinanceAdvancedTools })));
const FinanceSiiWorkspace = lazy(() => import("@/components/finance-sii-workspace").then((m) => ({ default: m.FinanceSiiWorkspace })));
const NuvaFinancialControl = lazy(() => import("@/components/nuva-financial-control").then((m) => ({ default: m.NuvaFinancialControl })));
const CollectionPriorityPanel = lazy(() => import("@/components/collection-priority-panel").then((m) => ({ default: m.CollectionPriorityPanel })));
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finanzas · Contabilidad · Tributación — Nüva One" }] }),
  component: Finance,
});

function Finance() {
  const { active } = useActiveBusiness();
  const businessId = active?.id;
  const { data: summary, isLoading } = useQuery({
    enabled: !!businessId,
    queryKey: ["finance-dashboard-summary", businessId],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("finance_dashboard_summary", { p_business_id: businessId });
      if (error) throw error;
      return data as { income: number; expense: number; inventory_value: number };
    },
  });
  const control = {
    income: Number(summary?.income ?? 0),
    expense: Number(summary?.expense ?? 0),
    inventoryValue: Number(summary?.inventory_value ?? 0),
  };


  return (
    <ModuleGuard module="finance">
      <div className="nuva-workspace nuva-workspace--finance space-y-5">
        <PageHeader
          title="Finanzas"
          description="Control financiero, contabilidad, tributación y decisiones sobre el dinero del negocio."
        />
        <Suspense fallback={<div className="space-y-3" aria-busy="true"><div className="h-28 animate-pulse rounded-2xl border bg-muted/30" /><div className="h-48 animate-pulse rounded-2xl border bg-muted/30" /></div>}>
          <nav aria-label="Secciones de Finanzas" className="sticky top-16 z-20 -mx-1 flex gap-2 overflow-x-auto bg-background/90 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/75">
            <a href="#finance-overview" className="shrink-0 rounded-full border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Resumen</a>
            <a href="#finance-collections" className="shrink-0 rounded-full border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Cobranza</a>
            <a href="#finance-tax" className="shrink-0 rounded-full border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">SII y tributación</a>
            <a href="#finance-tools" className="shrink-0 rounded-full border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Herramientas</a>
            <a href="#finance-accounting" className="shrink-0 rounded-full border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Contabilidad</a>
          </nav>
          <section id="finance-overview" aria-label="Resumen financiero" className="scroll-mt-28">
            <NuvaFinancialControl income={control.income} expense={control.expense} inventoryValue={control.inventoryValue} loading={isLoading} />
          </section>
          <section id="finance-collections" aria-label="Cobranza y prioridades" className="scroll-mt-28">
            <CollectionPriorityPanel />
          </section>
          <section id="finance-tax" aria-label="Servicios del SII y tributación" className="scroll-mt-28">
            <FinanceSiiWorkspace />
          </section>
          <section id="finance-tools" aria-label="Herramientas financieras avanzadas" className="scroll-mt-28">
            <FinanceAdvancedTools />
          </section>
          <section id="finance-accounting" aria-label="Contabilidad" className="scroll-mt-28">
            <FinanceAccountingWorkspaceV2 />
          </section>
        </Suspense>
      </div>
    </ModuleGuard>
  );
}
