import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CalendarClock, CheckCircle2, CircleDollarSign, Plus, Receipt, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ModuleGuard } from "@/components/module-guard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBizDelete, useBizInsert, useBizList, fmtCLP } from "@/lib/biz-data";
import { useMyRole, canWriteOperations } from "@/lib/use-business";

const TYPES = [
  ["operacional", "Operacional"], ["inventario", "Inventario"], ["laboral", "Laboral"],
  ["financiero", "Financiero"], ["tributario", "Tributario"], ["produccion", "Producción"],
  ["comercial", "Comercial"], ["logistico", "Logístico"], ["administrativo", "Administrativo"], ["otro", "Otro"],
] as const;
const BEHAVIOR = [["fijo", "Fijo"], ["variable", "Variable"], ["semivariable", "Semivariable"], ["extraordinario", "Extraordinario"]] as const;
const DOCS = [["factura", "Factura"], ["factura_exenta", "Factura exenta"], ["boleta", "Boleta"], ["nota_credito", "Nota de crédito"], ["nota_debito", "Nota de débito"], ["honorario", "Honorario"], ["recibo", "Recibo"], ["sin_documento", "Sin documento"], ["otro", "Otro"]] as const;
const STATUS = [["pending", "Pendiente"], ["partial", "Parcial"], ["paid", "Pagado"], ["cancelled", "Anulado"]] as const;
const money = (n: number) => fmtCLP(Math.round(n));

export function CostsWorkspace() {
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const { data: costs, isLoading } = useBizList<any>("costs", { order: "incurred_at" });
  const insert = useBizInsert("costs");
  const del = useBizDelete("costs");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", category: "Operación", cost_type: "operacional", behavior: "variable", allocation: "indirecto", amount_net: "", vat_rate: "19", incurred_at: new Date().toISOString().slice(0, 10), due_date: "", payment_status: "pending", payment_method: "transferencia", document_type: "sin_documento", document_number: "", tax_treatment: "pending", cost_center: "", recurring: false, recurring_frequency: "monthly", notes: "" });

  const totals = useMemo(() => {
    const rows = costs ?? [];
    const total = rows.filter((x: any) => x.payment_status !== "cancelled").reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
    const pending = rows.filter((x: any) => x.payment_status === "pending" || x.payment_status === "partial").reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
    const fixed = rows.filter((x: any) => x.behavior === "fijo").reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
    const variable = rows.filter((x: any) => x.behavior === "variable").reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
    const byCategory = rows.reduce((m: Record<string, number>, x: any) => { if (x.payment_status !== "cancelled") m[x.category] = (m[x.category] || 0) + Number(x.total_amount || 0); return m; }, {});
    return { total, pending, fixed, variable, byCategory };
  }, [costs]);

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const net = Number(form.amount_net) || 0;
    const rate = Number(form.vat_rate) || 0;
    const vat = Math.round(net * rate / 100);
    await insert.mutateAsync({ ...form, amount_net: net, vat_rate: rate, vat_amount: vat, total_amount: net + vat, recurring: form.recurring });
    setOpen(false);
    setForm((f) => ({ ...f, description: "", amount_net: "", document_number: "", notes: "" }));
  };

  return <ModuleGuard module="purchases"><div className="space-y-6">
    <PageHeader title="Costos" description="Registra, clasifica y conecta todos los costos de tu negocio con Finanzas, rentabilidad y control financiero inteligente." action={canWrite ? <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" />Registrar costo</Button></DialogTrigger><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Registrar costo</DialogTitle></DialogHeader><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label>Descripción</Label><Input value={form.description} onChange={e => update("description", e.target.value)} placeholder="Ej. Arriendo local, publicidad, flete, software..." required /></div>
      <div><Label>Categoría</Label><Input value={form.category} onChange={e => update("category", e.target.value)} placeholder="Ej. Arriendo" required /></div>
      <div><Label>Naturaleza</Label><Select value={form.cost_type} onValueChange={v => update("cost_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Comportamiento</Label><Select value={form.behavior} onValueChange={v => update("behavior", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BEHAVIOR.map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Asignación</Label><Select value={form.allocation} onValueChange={v => update("allocation", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="directo">Directo</SelectItem><SelectItem value="indirecto">Indirecto</SelectItem></SelectContent></Select></div>
      <div><Label>Neto (CLP)</Label><Input type="number" min="0" value={form.amount_net} onChange={e => update("amount_net", e.target.value)} required /></div>
      <div><Label>IVA %</Label><Input type="number" min="0" max="100" value={form.vat_rate} onChange={e => update("vat_rate", e.target.value)} /></div>
      <div><Label>Fecha del costo</Label><Input type="date" value={form.incurred_at} onChange={e => update("incurred_at", e.target.value)} required /></div>
      <div><Label>Vencimiento</Label><Input type="date" value={form.due_date} onChange={e => update("due_date", e.target.value)} /></div>
      <div><Label>Estado de pago</Label><Select value={form.payment_status} onValueChange={v => update("payment_status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUS.map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Medio de pago</Label><Input value={form.payment_method} onChange={e => update("payment_method", e.target.value)} /></div>
      <div><Label>Documento</Label><Select value={form.document_type} onValueChange={v => update("document_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DOCS.map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Folio / número</Label><Input value={form.document_number} onChange={e => update("document_number", e.target.value)} /></div>
      <div><Label>Centro de costo</Label><Input value={form.cost_center} onChange={e => update("cost_center", e.target.value)} placeholder="Administración, ventas..." /></div>
      <div><Label>Tratamiento tributario</Label><Select value={form.tax_treatment} onValueChange={v => update("tax_treatment", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendiente de revisión</SelectItem><SelectItem value="deductible">Deducible</SelectItem><SelectItem value="non_deductible">No deducible</SelectItem><SelectItem value="temporary_difference">Diferencia temporal</SelectItem><SelectItem value="permanent_difference">Diferencia permanente</SelectItem><SelectItem value="not_applicable">No aplica</SelectItem></SelectContent></Select></div>
      <div className="sm:col-span-2 flex items-center gap-3 rounded-lg border p-3"><input id="recurring" type="checkbox" checked={form.recurring} onChange={e => update("recurring", e.target.checked)} /><Label htmlFor="recurring">Costo recurrente</Label>{form.recurring && <Select value={form.recurring_frequency} onValueChange={v => update("recurring_frequency", v)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="monthly">Mensual</SelectItem><SelectItem value="quarterly">Trimestral</SelectItem><SelectItem value="yearly">Anual</SelectItem></SelectContent></Select>}</div>
      <div className="sm:col-span-2"><Label>Notas</Label><Input value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Contexto o respaldo interno" /></div>
      <Button type="submit" className="sm:col-span-2" disabled={insert.isPending}>Guardar costo y registrar impacto financiero</Button>
    </form></DialogContent></Dialog> : undefined} />

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Metric icon={CircleDollarSign} label="Costos registrados" value={money(totals.total)} />
      <Metric icon={CalendarClock} label="Pendiente de pago" value={money(totals.pending)} tone="warning" />
      <Metric icon={TrendingDown} label="Costos fijos" value={money(totals.fixed)} />
      <Metric icon={TrendingUp} label="Costos variables" value={money(totals.variable)} />
    </div>

    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2"><div className="mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><div><h2 className="font-semibold">Estructura de costos</h2><p className="text-xs text-muted-foreground">Dónde se concentra el dinero de tu operación.</p></div></div>{Object.keys(totals.byCategory).length === 0 ? <p className="text-sm text-muted-foreground">Registra costos para comenzar el análisis.</p> : <div className="space-y-3">{Object.entries(totals.byCategory).sort((a,b) => b[1]-a[1]).slice(0,6).map(([cat,val]) => <div key={cat}><div className="mb-1 flex justify-between text-sm"><span>{cat}</span><span className="font-medium">{money(val)}</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, totals.total ? val / totals.total * 100 : 0)}%` }} /></div></div>)}</div>}</Card>
      <Card className="p-5"><div className="mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /><div><h2 className="font-semibold">Control inteligente</h2><p className="text-xs text-muted-foreground">Señales para Finanzas.</p></div></div><div className="space-y-3 text-sm">{totals.pending > 0 ? <div className="rounded-lg border p-3"><b>{money(totals.pending)}</b> pendientes de pago. Revisa vencimientos para proteger tu caja.</div> : <div className="rounded-lg border p-3"><CheckCircle2 className="mr-2 inline h-4 w-4" />No hay costos pendientes registrados.</div>} {totals.variable > totals.fixed && <div className="rounded-lg border p-3">Los costos variables superan a los fijos. Úsalo para evaluar tu margen y punto de equilibrio.</div>}<div className="rounded-lg border p-3">Los costos registrados alimentan <b>Finanzas</b> automáticamente como egresos y quedan trazables por origen.</div></div></Card>
    </div>

    <Card>{isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando costos...</div> : !costs?.length ? <EmptyState icon={Receipt} title="Aún no hay costos" description="Registra arriendos, servicios, marketing, logística, inventario, honorarios y cualquier otro desembolso." /> : <Table><TableHeader><TableRow><TableHead>Descripción</TableHead><TableHead>Categoría</TableHead><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Pago</TableHead><TableHead className="text-right">Total</TableHead><TableHead /></TableRow></TableHeader><TableBody>{costs.map((c: any) => <TableRow key={c.id}><TableCell className="font-medium">{c.description}</TableCell><TableCell><Badge variant="secondary">{c.category}</Badge></TableCell><TableCell>{new Date(c.incurred_at).toLocaleDateString("es-CL")}</TableCell><TableCell className="capitalize text-muted-foreground">{c.behavior}</TableCell><TableCell><Badge variant={c.payment_status === "paid" ? "default" : "outline"}>{STATUS.find(([v]) => v === c.payment_status)?.[1] ?? c.payment_status}</Badge></TableCell><TableCell className="text-right font-medium">{money(Number(c.total_amount))}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => del.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table>}</Card>
  </div></ModuleGuard>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof CircleDollarSign; label: string; value: string; tone?: "warning" }) { return <Card className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-xl font-bold ${tone === "warning" ? "text-amber-600" : ""}`}>{value}</p></div></div></Card>; }
