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
  const [businessId] = useActiveBusiness();
  const { data: summary, isLoading } = useQuery({
    enabled: !!businessId,
    queryKey: ["finance-dashboard-summary", businessId],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("finance_dashboard_summary", { p_business_id: businessId });
      if (error) throw error;
      return data as { income: number; expense: number; inventory_value: number };
    },
  });
  const control = {
    income: Number(summary?.income ?? 0),
    expense: Number(summary?.expense ?? 0),
    inventoryValue: Number(summary?.inventory_value ?? 0),
  };

