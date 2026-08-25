import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBizList } from "@/lib/biz-data";
import { CustomerIntelligenceCard } from "@/components/customer-intelligence-card";

type Customer = {
  id: string;
  name: string;
  status: string;
  pipeline_stage?: string | null;
  last_contacted_at?: string | null;
};
type Sale = { customer_id?: string | null; total?: number | string | null; sale_date: string };
type Quote = {
  customer_id?: string | null;
  total?: number | string | null;
  status?: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/customer-intelligence")({
  head: () => ({ meta: [{ title: "CRM Intelligence — Nüva One" }] }),
  component: CustomerIntelligence,
});

function CustomerIntelligence() {
  const { data: customers, isLoading: customersLoading } = useBizList<Customer>("customers", {
    order: "name",
    ascending: true,
  });
  const { data: sales, isLoading: salesLoading } = useBizList<Sale>("sales", {
    order: "sale_date",
    ascending: false,
  });
  const { data: quotes, isLoading: quotesLoading } = useBizList<Quote>("quotes", {
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
          action={
            <Link to="/customers">
              <Button variant="outline">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver a Clientes
              </Button>
            </Link>
          }
        />

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !customers?.length ? (
          <EmptyState
            icon={Users}
            title="Aún no hay clientes"
            description="Agrega clientes para comenzar a generar inteligencia comercial."
          />
        ) : (
          <div className="space-y-5">
            <CustomerIntelligenceCard
              customers={customers ?? []}
              sales={sales ?? []}
              quotes={quotes ?? []}
              onViewCustomers={() => window.location.assign("/customers")}
              onAskAI={() => window.location.assign("/chat")}
            />
            <div className="rounded-xl border bg-muted/20 p-5 text-sm text-muted-foreground">
              <strong className="text-foreground">Próxima evolución:</strong> Customer 360 con
              Health Score, recencia, frecuencia, valor, pipeline, cotizaciones, actividades y
              próxima acción.
            </div>
          </div>
        )}
      </div>
    </ModuleGuard>
  );
}
