import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { CalendarDays, Clock3, FileText, ShieldCheck, Users, WalletCards } from "lucide-react";
import { useBizList } from "@/lib/biz-data";
import { ModuleGuard } from "@/components/module-guard";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/people")({
  head: () => ({ meta: [{ title: "Nüva People — Nüva One" }] }),
  component: People,
});

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function People() {
  const { data: employees = [], isLoading: employeesLoading } = useBizList<any>("people_employees", {
    order: "last_name",
  });
  const { data: contracts = [], isLoading: contractsLoading } = useBizList<any>("people_contracts", {
    order: "end_date",
  });
  const { data: leaveRequests = [], isLoading: leaveLoading } = useBizList<any>("people_leave_requests", {
    order: "start_date",
  });
  const { data: payrollPeriods = [], isLoading: payrollLoading } = useBizList<any>(
    "people_payroll_periods",
    { order: "period_year" },
  );
  const { data: payrollItems = [], isLoading: itemsLoading } = useBizList<any>("people_payroll_items");
  const { data: compliance = [], isLoading: complianceLoading } = useBizList<any>(
    "people_compliance_items",
    { order: "due_date" },
  );

  const loading =
    employeesLoading || contractsLoading || leaveLoading || payrollLoading || itemsLoading || complianceLoading;

  const activeEmployees = employees.filter((employee: any) => employee.employment_status === "active");
  const pendingLeave = leaveRequests.filter((request: any) => request.status === "pending").length;
  const openCompliance = compliance.filter(
    (item: any) => !["compliant", "not_applicable"].includes(item.status),
  );
  const expiringContracts = contracts.filter((contract: any) => {
    if (!contract.end_date || contract.status !== "active") return false;
    const days = (new Date(contract.end_date).getTime() - Date.now()) / 86_400_000;
    return days >= 0 && days <= 45;
  }).length;

  const currentPayroll = useMemo(() => {
    const latest = [...payrollPeriods].sort(
      (a: any, b: any) =>
        Number(`${b.period_year}${String(b.period_month).padStart(2, "0")}`) -
        Number(`${a.period_year}${String(a.period_month).padStart(2, "0")}`),
    )[0];
    if (!latest) return { period: "Sin período", cost: 0, status: "draft" };
    const cost = payrollItems
      .filter((item: any) => item.payroll_period_id === latest.id)
      .reduce((sum: number, item: any) => sum + Number(item.employer_cost_amount ?? 0), 0);
    return {
      period: `${latest.period_month}/${latest.period_year}`,
      cost,
      status: latest.status,
    };
  }, [payrollPeriods, payrollItems]);

  const cards = [
    { label: "Colaboradores activos", value: activeEmployees.length, icon: Users },
    { label: "Costo empleador último período", value: money.format(currentPayroll.cost), icon: WalletCards },
    { label: "Solicitudes pendientes", value: pendingLeave, icon: CalendarDays },
    { label: "Contratos próximos a vencer", value: expiringContracts, icon: FileText },
    { label: "Alertas de cumplimiento", value: openCompliance.length, icon: ShieldCheck },
    { label: "Estado de remuneraciones", value: currentPayroll.status, icon: Clock3 },
  ];

  return (
    <ModuleGuard module="people">
      <div className="p-4 md:p-6">
        <PageHeader
          title="Nüva People"
          description="Personas, contratos, asistencia, remuneraciones y cumplimiento conectados con la operación de tu negocio."
        />

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Cargando Nüva People">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="rounded-2xl p-5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-4 h-8 w-24" />
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cards.map(({ label, value, icon: Icon }) => (
                <Card key={label} className="rounded-2xl border-border/70 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/40 p-2.5">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">Centro de cumplimiento</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Vencimientos y obligaciones que requieren revisión.
                    </p>
                  </div>
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="mt-5 space-y-3">
                  {openCompliance.slice(0, 5).map((item: any) => (
                    <div key={item.id} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.status}</span>
                      </div>
                      {item.due_date && (
                        <p className="mt-1 text-xs text-muted-foreground">Vence: {item.due_date}</p>
                      )}
                    </div>
                  ))}
                  {openCompliance.length === 0 && (
                    <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                      No hay obligaciones pendientes registradas.
                    </p>
                  )}
                </div>
              </Card>

              <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">Lectura financiera de personas</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      El costo laboral queda preparado para conectarse con centros de costo y Nüva Intelligence.
                    </p>
                  </div>
                  <WalletCards className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">Período</p>
                    <p className="mt-1 font-semibold">{currentPayroll.period}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">Costo empleador</p>
                    <p className="mt-1 font-semibold">{money.format(currentPayroll.cost)}</p>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </ModuleGuard>
  );
}
