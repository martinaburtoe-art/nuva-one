import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { CustomerIntelligenceCard } from "@/components/customer-intelligence-card";
import { useBizList } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/customers-intelligence")({
  head: () => ({ meta: [{ title: "CRM Intelligence — Nüva One" }] }),
  component: CustomersIntelligence,
});

function CustomersIntelligence() {
  const { data: customers = [] } = useBizList<any>("customers", { order: "name", ascending: true });
  const { data: sales = [] } = useBizList<any>("sales", { order: "sale_date", ascending: false });
  const { data: quotes = [] } = useBizList<any>("quotes", {
    order: "created_at",
    ascending: false,
  });

  return (
    <ModuleGuard module="customers">
      <div className="p-4 md:p-6">
        <PageHeader
          title="CRM Intelligence"
          description="Prioridades, valor de cartera y señales comerciales detectadas por Nüva."
        />
        <div className="mt-6">
          <CustomerIntelligenceCard
            customers={customers}
            sales={sales}
            quotes={quotes}
            onViewCustomers={() => {
              window.location.href = "/customers";
            }}
            onAskAI={() => {
              window.location.href = "/chat";
            }}
          />
        </div>
      </div>
    </ModuleGuard>
  );
}
