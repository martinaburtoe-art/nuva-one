import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, FileCheck2, FileText, LockKeyhole, Play, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { ModuleGuard } from "@/components/module-guard";
import { PageHeader } from "@/components/page-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBizInsert, useBizList, useBizDelete } from "@/lib/biz-data";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/people-payroll")({ component: PeoplePayroll });
const emptyInput = { overtime_hours: 0, taxable_bonus: 0, non_taxable_bonus: 0, absences_days: 0, other_deductions: 0, advance_payment: 0, gratification_amount: 0, medical_leave_days: 0, medical_leave_rima: 0, notes: "" };

function PeoplePayroll() {
  const { data: employees = [] } = useBizList<any>("people_employees", { order: "last_name" });
  const { data: contracts = [] } = useBizList<any>("people_contracts", { order: "start_date" });
  const { data: periods = [] } = useBizList<any>("people_payroll_periods", { order: "period_year" });
  const { data: inputs = [] } = useBizList<any>("people_payroll_inputs");
  const { data: items = [] } = useBizList<any>("people_payroll_items");
  const { data: liquidations = [] } = useBizList<any>("people_payroll_liquidations");
  const { data: lre = [] } = useBizList<any>("people_lre_rows");
  const queryClient = useQueryClient();
  const { data: params = [] } = useQuery({ queryKey: ["people_legal_parameters"], queryFn: async () => { const { data, error } = await supabase.from("people_legal_parameters" as any).select("*").eq("country_code", "CL").order("effective_from", { ascending: false }); if (error) throw error; return data ?? []; } });
  const insertPeriod = useBizInsert("people_payroll_periods");
  const insertInput = useBizInsert("people_payroll_inputs");
  const deleteInput = useBizDelete("people_payroll_inputs");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [input, setInput] = useState(emptyInput);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [engineMessage, setEngineMessage] = useState<string | null>(null);
  const latestParams = useMemo(() => params.slice(0, 12), [params]);

  async function createPeriod() {
    try { const created = await insertPeriod.mutateAsync({ period_year: year, period_month: month, status: "draft", calculation_version: "cl-2026.12" }); setSelectedPeriod(created.id); setEngineMessage(`Período ${month}/${year} creado.`); }
    catch (error) { setEngineMessage(error instanceof Error ? error.message : "No fue posible crear el período."); }
  }
  async function saveInput() { if (!selectedPeriod || !selectedEmployee) return; try { await insertInput.mutateAsync({ payroll_period_id: selectedPeriod, employee_id: selectedEmployee, ...Object.fromEntries(Object.entries(input).map(([k, v]) => [k, typeof v === "number" ? Number(v) || 0 : v])) }); setInput(emptyInput); setEngineMessage("Datos variables guardados."); } catch (error) { setEngineMessage(error instanceof Error ? error.message : "No fue posible guardar los datos."); } }
  async function periodAction(periodId: string, action: "calculate" | "approve" | "lre" | "liquidate" | "finance" | "close") {
    setBusyId(periodId + action); setSelectedPeriod(periodId); setEngineMessage(null);
    try { const rpc = { calculate: "calculate_people_payroll_period", approve: "approve_people_payroll_period", lre: "prepare_people_lre", liquidate: "generate_people_liquidations", finance: "post_people_payroll_to_finance", close: "close_people_payroll_period" }[action]; const { data, error } = await supabase.rpc(rpc as any, { p_payroll_period_id: periodId }); if (error) throw error; const result = data as any;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["people_payroll_periods"] }),
        queryClient.invalidateQueries({ queryKey: ["people_payroll_inputs"] }),
        queryClient.invalidateQueries({ queryKey: ["people_payroll_items"] }),
        queryClient.invalidateQueries({ queryKey: ["people_payroll_liquidations"] }),
        queryClient.invalidateQueries({ queryKey: ["people_lre_rows"] }),
        queryClient.invalidateQueries({ queryKey: ["people_payroll_postings"] }),
      ]);
      setEngineMessage(action === "calculate" ? `Nómina calculada: ${result?.items ?? 0} colaboradores.` : action === "lre" ? `LRE preparado: ${result?.valid ?? 0} válidos / ${result?.invalid ?? 0} con observaciones.` : action === "liquidate" ? `Liquidaciones generadas: ${result?.liquidations ?? 0}.` : action === "finance" ? `Nómina enviada a revisión financiera: ${result?.employer_cost ?? 0} CLP.` : action === "approve" ? "Período aprobado." : action === "close" ? "Período cerrado y validado." : "Operación completada."); }
    catch (error) { setEngineMessage(error instanceof Error ? error.message : "No fue posible completar la operación."); } finally { setBusyId(null); }
  }
  const selectedInputs = inputs.filter((x: any) => x.payroll_period_id === selectedPeriod);
  const selectedItems = items.filter((x: any) => x.payroll_period_id === selectedPeriod);
  return <ModuleGuard module="people"><div className="p-4 md:p-6">
    <PageHeader title="Remuneraciones" description="Carga los datos del mes, calcula, valida, aprueba, genera liquidaciones/LRE y cierra el período." />
    <Card className="mb-5 rounded-2xl border-amber-500/30 bg-amber-500/5 p-4"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5" /><div><p className="font-semibold">Flujo operativo</p><p className="text-sm text-muted-foreground">Colaborador → contrato → datos del mes → cálculo → validación → aprobación → liquidaciones/LRE → cierre.</p></div></div></Card>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="rounded-2xl p-5"><Calculator className="h-5 w-5" /><h2 className="mt-3 font-semibold">1. Nuevo período</h2><div className="mt-4 grid grid-cols-2 gap-3"><div><Label>Año</Label><Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} /></div><div><Label>Mes</Label><Input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} /></div></div><Button className="mt-4 w-full" onClick={createPeriod} disabled={insertPeriod.isPending}><Play className="mr-2 h-4 w-4" />Crear período</Button></Card>
      <Card className="rounded-2xl p-5"><p className="text-sm text-muted-foreground">Colaboradores / contratos</p><p className="mt-2 text-3xl font-semibold">{employees.length}</p><p className="mt-1 text-sm text-muted-foreground">{contracts.length} contratos registrados</p></Card>
      <Card className="rounded-2xl p-5"><LockKeyhole className="h-5 w-5" /><p className="mt-3 font-semibold">Control de cierre</p><p className="mt-1 text-sm text-muted-foreground">Las acciones se habilitan según el estado real del período.</p></Card>
    </div>
    <Card className="mt-5 rounded-2xl p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">2. Datos variables del mes</h2><p className="text-sm text-muted-foreground">Horas extra, bonos, ausencias, anticipos, descuentos y gratificación.</p></div><span className="text-xs text-muted-foreground">{selectedInputs.length} entradas</span></div>
      {!selectedPeriod ? <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Crea o selecciona un período para cargar datos.</p> : <div className="mt-4 grid gap-3 lg:grid-cols-4">
        <div className="lg:col-span-2"><Label>Colaborador</Label><select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}><option value="">Seleccionar...</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} · {e.national_id || "sin RUT"}</option>)}</select></div>
        {Object.entries(input).filter(([k]) => k !== "notes").map(([key, value]) => <div key={key}><Label>{({ overtime_hours: "Horas extra", taxable_bonus: "Bono imponible", non_taxable_bonus: "Bono no imponible", absences_days: "Días ausencia", other_deductions: "Otros descuentos", advance_payment: "Anticipo", gratification_amount: "Gratificación", medical_leave_days: "Días licencia médica", medical_leave_rima: "RIMA licencia médica" } as any)[key] || key}</Label><Input type="number" min={0} step="0.01" value={String(value)} onChange={e => setInput(v => ({ ...v, [key]: Number(e.target.value) }))} /></div>)}
        <div className="lg:col-span-4"><Label>Notas</Label><Input value={input.notes} onChange={e => setInput(v => ({ ...v, notes: e.target.value }))} placeholder="Observación opcional" /></div><div className="lg:col-span-4 flex justify-end"><Button onClick={saveInput} disabled={insertInput.isPending || !selectedEmployee}><Plus className="mr-2 h-4 w-4" />Guardar datos del mes</Button></div>
      </div>}
      {selectedPeriod && selectedInputs.length > 0 && <div className="mt-5 space-y-2">{selectedInputs.map((x: any) => <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm"><span>{employees.find((e: any) => e.id === x.employee_id)?.first_name} {employees.find((e: any) => e.id === x.employee_id)?.last_name}</span><span>HE {x.overtime_hours} · Bono {x.taxable_bonus} · Ausencias {x.absences_days}</span><Button size="sm" variant="ghost" onClick={() => deleteInput.mutate(x.id)}><Trash2 className="h-4 w-4" /></Button></div>)}</div>}
    </Card>
    <Card className="mt-5 rounded-2xl p-5"><h2 className="font-semibold">3. Períodos y acciones</h2><div className="mt-4 space-y-3">{periods.length === 0 ? <p className="text-sm text-muted-foreground">No hay períodos creados.</p> : periods.map((p: any) => { const locked = ["closed", "void"].includes(p.status); return <div key={p.id} className={`rounded-xl border p-3 ${selectedPeriod === p.id ? "border-indigo-500/50 bg-indigo-500/5" : ""}`} onClick={() => setSelectedPeriod(p.id)}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{p.period_month}/{p.period_year}</p><p className="text-xs text-muted-foreground">Estado: {p.status} · {items.filter((x: any) => x.payroll_period_id === p.id).length} calculados</p></div><div className="flex flex-wrap gap-2">
      {p.status === "draft" && <Button size="sm" variant="outline" disabled={busyId === p.id + "calculate"} onClick={e => { e.stopPropagation(); periodAction(p.id, "calculate"); }}><Calculator className="mr-1 h-3.5 w-3.5" />Calcular</Button>}
      {p.status === "calculated" && <Button size="sm" variant="outline" disabled={busyId === p.id + "approve"} onClick={e => { e.stopPropagation(); periodAction(p.id, "approve"); }}><FileCheck2 className="mr-1 h-3.5 w-3.5" />Aprobar</Button>}
      {["calculated", "approved"].includes(p.status) && <Button size="sm" variant="outline" disabled={busyId === p.id + "lre"} onClick={e => { e.stopPropagation(); periodAction(p.id, "lre"); }}><FileText className="mr-1 h-3.5 w-3.5" />LRE</Button>}
      {["approved", "closed"].includes(p.status) && <Button size="sm" variant="outline" disabled={busyId === p.id + "liquidate"} onClick={e => { e.stopPropagation(); periodAction(p.id, "liquidate"); }}>Liquidaciones</Button>}
      {["approved", "closed"].includes(p.status) && <Button size="sm" variant="outline" disabled={busyId === p.id + "finance"} onClick={e => { e.stopPropagation(); periodAction(p.id, "finance"); }}>Enviar a Finanzas</Button>}
      {p.status === "approved" && !locked && <Button size="sm" disabled={busyId === p.id + "close"} onClick={e => { e.stopPropagation(); periodAction(p.id, "close"); }}>Cerrar</Button>}
    </div></div></div>; })}</div></Card>
    {engineMessage && <Card className="mt-5 rounded-2xl border-indigo-500/30 bg-indigo-500/5 p-4 text-sm">{engineMessage}</Card>}
    {selectedPeriod && <div className="mt-5 grid gap-4 md:grid-cols-3"><Card className="rounded-2xl p-5"><p className="text-sm text-muted-foreground">Cálculos</p><p className="mt-2 text-2xl font-semibold">{selectedItems.length}</p></Card><Card className="rounded-2xl p-5"><p className="text-sm text-muted-foreground">Liquidaciones</p><p className="mt-2 text-2xl font-semibold">{liquidations.filter((x: any) => x.payroll_period_id === selectedPeriod).length}</p></Card><Card className="rounded-2xl p-5"><p className="text-sm text-muted-foreground">LRE</p><p className="mt-2 text-2xl font-semibold">{lre.filter((x: any) => x.payroll_period_id === selectedPeriod).length}</p></Card></div>}
    <Card className="mt-5 rounded-2xl p-5"><h2 className="font-semibold">Parámetros legales cargados</h2><div className="mt-4 grid gap-2 md:grid-cols-2">{latestParams.map((p: any) => <div key={p.id} className="rounded-xl border p-3"><div className="flex justify-between gap-3 text-sm"><span>{p.parameter_key}</span><span>{p.value_numeric ?? p.value_text ?? "—"}</span></div><p className="mt-1 text-xs text-muted-foreground">Vigente desde {p.effective_from}</p></div>)}</div></Card>
  </div></ModuleGuard>;
}
