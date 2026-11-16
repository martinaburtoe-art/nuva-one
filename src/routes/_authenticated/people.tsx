// Build marker: keeps Vercel deployment synchronized with the repaired npm lockfile.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Clock3, FileText, ShieldCheck, Users, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { ModuleGuard } from "@/components/module-guard";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/people")({ head: () => ({ meta: [{ title: "Nüva People — Nüva One" }] }), component: People });
const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

function People() {
  const { active } = useActiveBusiness();
  const businessId = active?.id;
  const { data: summary, isLoading } = useQuery({
    enabled: !!businessId,
    queryKey: ["people-dashboard-summary", businessId],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("people_dashboard_summary", { p_business_id: businessId });
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
    { label: "Costo empleador último período", value: money.format(currentPayroll.cost), icon: WalletCards, tone: "violet" },
    { label: "Solicitudes pendientes", value: pendingLeave, icon: CalendarDays, tone: "cyan" },
    { label: "Contratos próximos a vencer", value: expiringContracts, icon: FileText, tone: "amber" },
    { label: "Alertas de cumplimiento", value: openCompliance.length, icon: ShieldCheck, tone: "rose" },
    { label: "Estado de remuneraciones", value: currentPayroll.status, icon: Clock3, tone: "emerald" },
  ];
  const workspaces = [
    ["Colaboradores", "Directorio y fichas laborales", "/people-employees", Users],
    ["Asistencia", "Jornada y eventos", "/people-attendance", Clock3],
    ["Remuneraciones", "Períodos y control de nómina", "/people-payroll", WalletCards],
    ["Vacaciones y finiquitos", "Solicitudes, saldos y terminaciones", "/people-lifecycle", CalendarDays],
    ["Cumplimiento", "Obligaciones y vencimientos", "/people-compliance", ShieldCheck],
  ] as const;
  return <ModuleGuard module="people"><div className="nuva-workspace nuva-workspace--people space-y-5 p-4 md:p-6">
    <PageHeader title="Nüva People" description="Personas, contratos, asistencia, remuneraciones y cumplimiento conectados con la operación de tu negocio." />
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-950 to-amber-900 p-5 text-white shadow-xl shadow-orange-950/10 sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge className="border border-white/15 bg-white/10 text-orange-100 hover:bg-white/10">NÜVA · PEOPLE OPERATIONS</Badge><span className="text-xs text-orange-100/70">Gestión de personas</span></div><h2 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Tu equipo, organizado. Tu operación, en movimiento.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-orange-100/75">Una vista central para coordinar personas, jornada, remuneraciones y obligaciones laborales.</p></div>
        <div className="flex items-end gap-4 rounded-2xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur-sm"><div><p className="text-xs text-orange-100/70">Colaboradores activos</p><p className="mt-1 text-4xl font-bold tabular-nums">{isLoading ? "—" : activeEmployees}</p></div><Link to="/people-employees" className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-950 transition hover:bg-orange-50" aria-label="Ver colaboradores"><ArrowRight className="h-5 w-5" /></Link></div>
      </div>
    </section>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{workspaces.map(([title, desc, to, Icon]) => <Link key={to} to={to as any} className="group min-w-0 rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-orange-400/40 hover:shadow-md"><div className="flex items-center justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/10 text-orange-600"><Icon className="h-5 w-5" aria-hidden="true" /></span><ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-orange-600" /></div><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{desc}</p></Link>)}</div>
    {isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Cargando Nüva People">{Array.from({ length: 5 }).map((_, index) => <Card key={index} className="rounded-2xl p-5"><Skeleton className="h-5 w-32" /><Skeleton className="mt-4 h-8 w-24" /></Card>)}</div> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({ label, value, icon: Icon, tone }) => <Card key={label} className="min-w-0 rounded-2xl border-border/70 p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs leading-5 text-muted-foreground">{label}</p><p className="mt-2 break-words text-xl font-semibold tracking-tight">{label === "Estado de remuneraciones" ? (({ draft: "Borrador", calculated: "Calculada", approved: "Aprobada", paid: "Pagada", closed: "Cerrada" } as Record<string, string>)[String(value)] ?? value) : value}</p></div><div className={`rounded-xl border p-2.5 ${tone === "violet" ? "border-violet-500/20 bg-violet-500/10 text-violet-600" : tone === "cyan" ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-600" : tone === "amber" ? "border-amber-500/20 bg-amber-500/10 text-amber-600" : tone === "rose" ? "border-rose-500/20 bg-rose-500/10 text-rose-600" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"}`}><Icon className="h-5 w-5" aria-hidden="true" /></div></div></Card>)}</div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><Card className="rounded-2xl border-border/70 p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Centro de cumplimiento</h2><p className="mt-1 text-sm text-muted-foreground">Vencimientos y obligaciones que requieren revisión.</p></div><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div><div className="mt-5 space-y-3">{openCompliance.slice(0, 5).map((item: any) => <div key={item.id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{item.title}</span><span className="text-xs text-muted-foreground">{item.status}</span></div>{item.due_date && <p className="mt-1 text-xs text-muted-foreground">Vence: {item.due_date}</p>}</div>)}{openCompliance.length === 0 && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No hay obligaciones pendientes registradas.</p>}</div></Card>
      <Card className="rounded-2xl border-border/70 p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Lectura financiera de personas</h2><p className="mt-1 text-sm text-muted-foreground">El costo laboral queda preparado para conectarse con centros de costo y Nüva Intelligence.</p></div><WalletCards className="h-5 w-5" aria-hidden="true" /></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Período</p><p className="mt-1 font-semibold">{currentPayroll.period}</p></div><div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Costo empleador</p><p className="mt-1 font-semibold">{money.format(currentPayroll.cost)}</p></div></div></Card></div>
    </>}
  </div></ModuleGuard>;
}
