import { createFileRoute } from "@tanstack/react-router";
import { useBizList } from "@/lib/biz-data";
import { useMyRole, canWriteOperations } from "@/lib/use-business";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { CrmActionCenter } from "@/components/crm-action-center";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/customer-action-center")({
  head: () => ({ meta: [{ title: "Action Center CRM — Nüva One" }] }),
  component: CustomerActionCenter,
});

function CustomerActionCenter() {
  const { data: role } = useMyRole();
  const { data: customers, isLoading: customersLoading } = useBizList<any>("customers", { order: "name" });
  const { data: sales, isLoading: salesLoading } = useBizList<any>("sales", { order: "sale_date" });
  const { data: quotes, isLoading: quotesLoading } = useBizList<any>("quotes", { order: "created_at" });
  const { data: activities, isLoading: activitiesLoading } = useBizList<any>("customer_activities", { order: "created_at" });

  const loading = customersLoading || salesLoading || quotesLoading || activitiesLoading;

  return (
    <ModuleGuard module="customers">
      <div className="p-4 md:p-6">
        <PageHeader
          title="CRM Action Center"
          description="Prioriza clientes, ejecuta seguimientos y controla las acciones comerciales que Nüva recomienda."
        />
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
        ) : (
          <CrmActionCenter
            customers={customers ?? []}
            sales={sales ?? []}
            quotes={quotes ?? []}
            activities={activities ?? []}
            canWrite={canWriteOperations(role)}
          />
        )}
      </div>
    </ModuleGuard>
  );
}