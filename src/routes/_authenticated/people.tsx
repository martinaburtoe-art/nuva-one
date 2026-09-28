// Build marker: keeps Vercel deployment synchronized with the repaired npm lockfile.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock3, FileText, ShieldCheck, Users, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { ModuleGuard } from "@/components/module-guard";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/people")({ head: () => ({ meta: [{ title: "Nüva People — Nüva One" }] }), component: People });
const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

function People() {
  const [businessId] = useActiveBusiness();
  const { data: summary, isLoading } = useQuery({
    enabled: !!businessId,
    queryKey: ["people-dashboard-summary", businessId],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("people_dashboard_summary", { p_business_id: businessId });
      if (error) throw error;
      return data as any;
    },
  });
  const activeEmployees = Number(summary?.active_employees ?? 0);
  const pendingLeave = Number(summary?.pending_leave ?? 0);
  const expiringContracts = Number(summary?.expiring_contracts ?? 0);
  const openCompliance = Array.isArray(summary?.compliance) ? summary.compliance : [];
  const currentPayroll = summary?.payroll ?? { period: "Sin período", cost: 0, status: "draft" };
  const cards = [
    { label: "Colaboradores activos", value: activeEmployees.length, icon: Users },
    { label: "Costo empleador último período", value: money.format(currentPayroll.cost), icon: WalletCards },
    { label: "Solicitudes pendientes", value: pendingLeave, icon: CalendarDays },
    { label: "Contratos próximos a vencer", value: expiringContracts, icon: FileText },
    { label: "Alertas de cumplimiento", value: openCompliance.length, icon: ShieldCheck },
    { label: "Estado de remuneraciones", value: currentPayroll.status, icon: Clock3 },
  ];
  const workspaces = [
    ["Colaboradores", "Directorio y fichas laborales", "/people-employees"],
    ["Asistencia", "Jornada y eventos", "/people-attendance"],
    ["Remuneraciones", "Períodos y control de nómina", "/people-payroll"],
    ["Vacaciones y finiquitos", "Solicitudes, saldos y terminaciones", "/people-lifecycle"],
    ["Cumplimiento", "Obligaciones y vencimientos", "/people-compliance"],
  ];
  return <ModuleGuard module="people"><div className="p-4 md:p-6">
    <PageHeader title="Nüva People" description="Personas, contratos, asistencia, remuneraciones y cumplimiento conectados con la operación de tu negocio." />
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{workspaces.map(([title, desc, to]) => <Link key={to} to={to as any} className="rounded-2xl border p-4 transition hover:bg-muted/40"><p className="font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{desc}</p></Link>)}</div>
    {loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Cargando Nüva People">{Array.from({ length: 6 }).map((_, index) => <Card key={index} className="rounded-2xl p-5"><Skeleton className="h-5 w-32" /><Skeleton className="mt-4 h-8 w-24" /></Card>)}</div> : <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map(({ label, value, icon: Icon }) => <Card key={label} className="rounded-2xl border-border/70 p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p></div><div className="rounded-xl border bg-muted/40 p-2.5"><Icon className="h-5 w-5" aria-hidden="true" /></div></div></Card>)}</div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><Card className="rounded-2xl border-border/70 p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Centro de cumplimiento</h2><p className="mt-1 text-sm text-muted-foreground">Vencimientos y obligaciones que requieren revisión.</p></div><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div><div className="mt-5 space-y-3">{openCompliance.slice(0, 5).map((item: any) => <div key={item.id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{item.title}</span><span className="text-xs text-muted-foreground">{item.status}</span></div>{item.due_date && <p className="mt-1 text-xs text-muted-foreground">Vence: {item.due_date}</p>}</div>)}{openCompliance.length === 0 && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No hay obligaciones pendientes registradas.</p>}</div></Card>
      <Card className="rounded-2xl border-border/70 p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Lectura financiera de personas</h2><p className="mt-1 text-sm text-muted-foreground">El costo laboral queda preparado para conectarse con centros de costo y Nüva Intelligence.</p></div><WalletCards className="h-5 w-5" aria-hidden="true" /></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Período</p><p className="mt-1 font-semibold">{currentPayroll.period}</p></div><div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Costo empleador</p><p className="mt-1 font-semibold">{money.format(currentPayroll.cost)}</p></div></div></Card></div>
    </>}
  </div></ModuleGuard>;
}
