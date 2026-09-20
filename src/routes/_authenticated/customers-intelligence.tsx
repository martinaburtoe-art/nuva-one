import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { CustomerIntelligenceCard } from "@/components/customer-intelligence-card";
import { useBizList } from "@/lib/biz-data";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/customers-intelligence")({
  head: () => ({ meta: [{ title: "CRM Intelligence — Nüva One" }] }),
  component: CustomersIntelligence,
});

function CustomersIntelligence() {
  const navigate = useNavigate();
  const { data: customers = [], isLoading: customersLoading } = useBizList<any>("customers", { order: "name", ascending: true });
  const { data: sales = [], isLoading: salesLoading } = useBizList<any>("sales", { order: "sale_date", ascending: false });
  const { data: quotes = [], isLoading: quotesLoading } = useBizList<any>("quotes", {
    order: "created_at",
    ascending: false,
  });

  const loading = customersLoading || salesLoading || quotesLoading;

  return (
    <ModuleGuard module="customers">
      <div className="p-4 md:p-6">
        <PageHeader
          title="CRM Intelligence"
          description="Prioridades, valor de cartera y señales comerciales detectadas por Nüva."
        />
        <div className="mt-6" aria-live="polite">
          {loading ? <div className="space-y-3"><Skeleton className="h-64 w-full" /></div> : <CustomerIntelligenceCard
            customers={customers}
            sales={sales}
            quotes={quotes}
            onViewCustomers={() => {
              navigate({ to: "/customers" });
            }}
            onAskAI={() => {
              navigate({ to: "/ai" });
            }}
          />}
        </div>
      </div>
    </ModuleGuard>
  );
}
