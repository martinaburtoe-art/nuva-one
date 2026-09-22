import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, LockKeyhole, Play, ShieldCheck } from "lucide-react";
import { ModuleGuard } from "@/components/module-guard";
import { PageHeader } from "@/components/page-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBizInsert, useBizList } from "@/lib/biz-data";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/people-payroll")({ component: PeoplePayroll });

function PeoplePayroll() {
  const { data: employees = [] } = useBizList<any>("people_employees", { order: "last_name" });
  const { data: contracts = [] } = useBizList<any>("people_contracts", { order: "start_date" });
  const { data: periods = [] } = useBizList<any>("people_payroll_periods", { order: "period_year" });
  const { data: params = [] } = useQuery({ queryKey: ["people_legal_parameters"], queryFn: async () => { const { data, error } = await supabase.from("people_legal_parameters" as any).select("*").eq("country_code", "CL").order("effective_from", { ascending: false }); if (error) throw error; return data ?? []; } });
  const insertPeriod = useBizInsert("people_payroll_periods");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const latestParams = useMemo(() => params.slice(0, 6), [params]);

  async function createPeriod() { await insertPeriod.mutateAsync({ period_year: year, period_month: month, status: "draft", calculation_version: "cl-2026.1" }); }

  return <ModuleGuard module="people"><div className="p-4 md:p-6">
    <PageHeader title="Remuneraciones" description="Ciclo mensual, simulación y control del costo laboral. El cierre productivo requiere validación legal independiente." />
    <Card className="mb-5 rounded-2xl border-amber-500/30 bg-amber-500/5 p-4"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5" /><div><p className="font-semibold">Motor protegido por parámetros</p><p className="text-sm text-muted-foreground">Las reglas legales se almacenan con vigencia y fuente. Nüva no debe cerrar una nómina real hasta completar AFP, salud, AFC, impuesto único, gratificaciones, finiquitos y validación LRE.</p></div></div></Card>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="rounded-2xl p-5"><Calculator className="h-5 w-5" /><h2 className="mt-3 font-semibold">Nuevo período</h2><div className="mt-4 grid grid-cols-2 gap-3"><div><Label>Año</Label><Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div><div><Label>Mes</Label><Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} /></div></div><Button className="mt-4 w-full" onClick={createPeriod} disabled={insertPeriod.isPending}><Play className="mr-2 h-4 w-4" />Crear período</Button></Card>
      <Card className="rounded-2xl p-5"><p className="text-sm text-muted-foreground">Colaboradores</p><p className="mt-2 text-3xl font-semibold">{employees.length}</p><p className="mt-1 text-sm text-muted-foreground">Contratos registrados: {contracts.length}</p></Card>
      <Card className="rounded-2xl p-5"><LockKeyhole className="h-5 w-5" /><p className="mt-3 font-semibold">Cierre</p><p className="mt-1 text-sm text-muted-foreground">Aprobación y cierre deben quedar restringidos a roles elevados y auditados.</p></Card>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-2"><Card className="rounded-2xl p-5"><h2 className="font-semibold">Períodos</h2><div className="mt-4 space-y-2">{periods.length === 0 ? <p className="text-sm text-muted-foreground">No hay períodos creados.</p> : periods.map((p: any) => <div key={p.id} className="flex justify-between rounded-xl border p-3 text-sm"><span>{p.period_month}/{p.period_year}</span><span>{p.status}</span></div>)}</div></Card><Card className="rounded-2xl p-5"><h2 className="font-semibold">Parámetros legales cargados</h2><div className="mt-4 space-y-2">{latestParams.map((p: any) => <div key={p.id} className="rounded-xl border p-3"><div className="flex justify-between gap-3 text-sm"><span>{p.parameter_key}</span><span>{p.value_numeric}</span></div><p className="mt-1 text-xs text-muted-foreground">Vigente desde {p.effective_from}</p></div>)}</div></Card></div>
  </div></ModuleGuard>;
}
