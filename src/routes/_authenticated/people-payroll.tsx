import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, FileCheck2, FileText, LockKeyhole, Play, ShieldCheck } from "lucide-react";
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
  const { data: params = [] } = useQuery({
    queryKey: ["people_legal_parameters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("people_legal_parameters" as any).select("*").eq("country_code", "CL").order("effective_from", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const insertPeriod = useBizInsert("people_payroll_periods");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [engineMessage, setEngineMessage] = useState<string | null>(null);
  const latestParams = useMemo(() => params.slice(0, 10), [params]);

  async function createPeriod() {
    await insertPeriod.mutateAsync({ period_year: year, period_month: month, status: "draft", calculation_version: "cl-2026.3" });
  }

  async function periodAction(periodId: string, action: "calculate" | "approve" | "lre" | "liquidate" | "close") {
    setBusyId(periodId + action);
    setEngineMessage(null);
    try {
      const rpc = {
        calculate: "calculate_people_payroll_period",
        approve: "approve_people_payroll_period",
        lre: "prepare_people_lre",
        liquidate: "generate_people_liquidations",
        close: "close_people_payroll_period",
      }[action];
      const { data, error } = await supabase.rpc(rpc as any, { p_payroll_period_id: periodId });
      if (error) throw error;
      const result = data as any;
      setEngineMessage(
        action === "calculate" ? `Nómina calculada: ${result?.items ?? 0} colaboradores.`
          : action === "lre" ? `LRE preparado: ${result?.valid ?? 0} válidos / ${result?.invalid ?? 0} con observaciones.`
          : action === "liquidate" ? `Liquidaciones generadas: ${result?.liquidations ?? 0}.`
          : action === "approve" ? "Período aprobado. El cálculo queda protegido para el cierre."
          : action === "close" ? "Período cerrado y validado contra LRE."
          : "Operación completada."
      );
    } catch (error) {
      setEngineMessage(error instanceof Error ? error.message : "No fue posible completar la operación.");
    } finally {
      setBusyId(null);
    }
  }

  return <ModuleGuard module="people"><div className="p-4 md:p-6">
    <PageHeader title="Remuneraciones" description="Ciclo mensual, cálculo auditable, liquidaciones, LRE y cierre controlado." />
    <Card className="mb-5 rounded-2xl border-amber-500/30 bg-amber-500/5 p-4"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5" /><div><p className="font-semibold">Motor protegido por parámetros legales</p><p className="text-sm text-muted-foreground">Cada cálculo conserva su versión y snapshot. La aprobación y el cierre exigen validaciones previas y están restringidos a owner/admin.</p></div></div></Card>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="rounded-2xl p-5"><Calculator className="h-5 w-5" /><h2 className="mt-3 font-semibold">Nuevo período</h2><div className="mt-4 grid grid-cols-2 gap-3"><div><Label>Año</Label><Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div><div><Label>Mes</Label><Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} /></div></div><Button className="mt-4 w-full" onClick={createPeriod} disabled={insertPeriod.isPending}><Play className="mr-2 h-4 w-4" />Crear período</Button></Card>
      <Card className="rounded-2xl p-5"><p className="text-sm text-muted-foreground">Colaboradores</p><p className="mt-2 text-3xl font-semibold">{employees.length}</p><p className="mt-1 text-sm text-muted-foreground">Contratos registrados: {contracts.length}</p></Card>
      <Card className="rounded-2xl p-5"><LockKeyhole className="h-5 w-5" /><p className="mt-3 font-semibold">Control de cierre</p><p className="mt-1 text-sm text-muted-foreground">Calculado → aprobado → LRE/liquidaciones → cerrado.</p></Card>
    </div>
    {engineMessage && <Card className="mt-5 rounded-2xl border-indigo-500/30 bg-indigo-500/5 p-4 text-sm">{engineMessage}</Card>}
    <Card className="mt-5 rounded-2xl p-5"><h2 className="font-semibold">Períodos</h2><div className="mt-4 space-y-3">{periods.length === 0 ? <p className="text-sm text-muted-foreground">No hay períodos creados.</p> : periods.map((p: any) => {
      const locked = ["closed","void"].includes(p.status);
      return <div key={p.id} className="rounded-xl border p-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{p.period_month}/{p.period_year}</p><p className="text-xs text-muted-foreground">Estado: {p.status}</p></div><div className="flex flex-wrap gap-2">
          {p.status === "draft" && <Button size="sm" variant="outline" disabled={busyId===p.id+"calculate"} onClick={() => periodAction(p.id,"calculate")}><Calculator className="mr-1 h-3.5 w-3.5" />Calcular</Button>}
          {p.status === "calculated" && <Button size="sm" variant="outline" disabled={busyId===p.id+"approve"} onClick={() => periodAction(p.id,"approve")}><FileCheck2 className="mr-1 h-3.5 w-3.5" />Aprobar</Button>}
          {["calculated","approved"].includes(p.status) && <Button size="sm" variant="outline" disabled={busyId===p.id+"lre"} onClick={() => periodAction(p.id,"lre")}><FileText className="mr-1 h-3.5 w-3.5" />LRE</Button>}
          {["approved","closed"].includes(p.status) && <Button size="sm" variant="outline" disabled={busyId===p.id+"liquidate"} onClick={() => periodAction(p.id,"liquidate")}>Liquidaciones</Button>}
          {p.status === "approved" && <Button size="sm" disabled={busyId===p.id+"close"} onClick={() => periodAction(p.id,"close")}>Cerrar</Button>}
        </div></div>
      </div>;
    })}</div></Card>
    <Card className="mt-5 rounded-2xl p-5"><h2 className="font-semibold">Parámetros legales cargados</h2><div className="mt-4 grid gap-2 md:grid-cols-2">{latestParams.map((p: any) => <div key={p.id} className="rounded-xl border p-3"><div className="flex justify-between gap-3 text-sm"><span>{p.parameter_key}</span><span>{p.value_numeric ?? p.value_text ?? "—"}</span></div><p className="mt-1 text-xs text-muted-foreground">Vigente desde {p.effective_from}</p></div>)}</div></Card>
  </div></ModuleGuard>;
}
