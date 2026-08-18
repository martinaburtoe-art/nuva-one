import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { useActiveBusiness } from "@/lib/use-business";
import { useBizList, fmtCLP } from "@/lib/biz-data";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, BookOpenCheck,
  CalendarClock, CheckCircle2, ClipboardCheck, FileCheck2, Landmark,
  ReceiptText, Scale, ShieldCheck, WalletCards,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/financial-control")({
  head: () => ({ meta: [{ title: "Control Financiero Profesional — Nüva One" }] }),
  component: FinancialControl,
});

type Tab = "overview" | "results" | "cash" | "tax" | "close";

function FinancialControl() {
  const { active } = useActiveBusiness();
  const [tab, setTab] = useState<Tab>("overview");
  const { data: pnl = [] } = useBizList<any>("v_financial_management_pnl_monthly", { order: "period_start", ascending: false });
  const { data: cash = [] } = useBizList<any>("v_cash_flow_daily", { order: "flow_date", ascending: false });
  const { data: close = [] } = useBizList<any>("v_financial_close_status", { order: "period_end", ascending: false });
  const { data: recon = [] } = useBizList<any>("financial_reconciliation_items", { order: "period_end", ascending: false });
  const { data: bank = [] } = useBizList<any>("bank_reconciliation_sessions", { order: "period_end", ascending: false });
  const { data: papers = [] } = useBizList<any>("tax_working_papers", { order: "tax_year", ascending: false });
  const { data: payments = [] } = useBizList<any>("tax_payments", { order: "due_date" });

  const latest = pnl[0];
  const previous = pnl[1];
  const cash30 = cash.slice(0, 30);
  const cashNet = useMemo(() => cash30.reduce((s: number, x: any) => s + Number(x.net_flow || 0), 0), [cash30]);
  const cashIn = useMemo(() => cash30.reduce((s: number, x: any) => s + Math.max(0, Number(x.inflow || 0)), 0), [cash30]);
  const cashOut = useMemo(() => cash30.reduce((s: number, x: any) => s + Math.max(0, Number(x.outflow || 0)), 0), [cash30]);
  const exceptions = recon.filter((x: any) => ["open", "partial", "exception"].includes(x.status)).length;
  const critical = recon.filter((x: any) => ["exception", "blocked"].includes(x.status)).length;
  const dueTaxes = payments.filter((x: any) => ["planned", "due", "overdue", "partial"].includes(x.status)).reduce((s: number, x: any) => s + Math.max(0, Number(x.amount || 0) - Number(x.paid_amount || 0)), 0);
  const overdueTaxes = payments.filter((x: any) => x.status === "overdue").length;
  const latestClose = close[0];
  const closePct = latestClose?.total_items ? Math.round((Number(latestClose.passed_items || 0) / Number(latestClose.total_items)) * 100) : 0;
  const resultDelta = latest && previous ? Number(latest.net_result || 0) - Number(previous.net_result || 0) : 0;
  const readiness = Math.max(0, Math.min(100, 100 - critical * 20 - exceptions * 5 - overdueTaxes * 10));

  return <ModuleGuard module="finance">
    <PageHeader title="Control Financiero Profesional" description={`Contabilidad, resultados, caja, conciliación, cierre y obligaciones tributarias${active ? ` · ${active.name}` : ""}`} />
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Resultado último período" value={fmtCLP(Number(latest?.net_result || 0))} icon={<Scale />} good={Number(latest?.net_result || 0) >= 0} detail={resultDelta ? `${resultDelta >= 0 ? "+" : ""}${fmtCLP(resultDelta)} vs. período anterior` : undefined} />
        <Kpi title="Flujo neto · 30 días" value={fmtCLP(cashNet)} icon={<WalletCards />} good={cashNet >= 0} detail={`Entradas ${fmtCLP(cashIn)} · Salidas ${fmtCLP(cashOut)}`} />
        <Kpi title="Obligaciones pendientes" value={fmtCLP(dueTaxes)} icon={<ReceiptText />} good={dueTaxes === 0} detail={overdueTaxes ? `${overdueTaxes} vencida(s)` : "Sin vencimientos atrasados"} />
        <Kpi title="Preparación para cierre" value={`${readiness}%`} icon={<ShieldCheck />} good={readiness >= 90} detail={`${exceptions} excepción(es) · ${closePct}% checklist`} />
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-2">
        {([['overview','Resumen'],['results','Estado de resultados'],['cash','Flujo de caja'],['tax','F29 · PPM · Renta'],['close','Cierre · Auditoría']] as [Tab,string][]).map(([key,label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab === key ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{label}</button>)}
      </div>

      {tab === "overview" && <Overview pnl={pnl} cash={cash30} recon={recon} payments={payments} close={close} readiness={readiness} />}
      {tab === "results" && <Results pnl={pnl} />}
      {tab === "cash" && <CashFlow cash={cash} />}
      {tab === "tax" && <TaxControl papers={papers} payments={payments} pnl={pnl} />}
      {tab === "close" && <CloseControl close={close} recon={recon} bank={bank} />}

      <Card className="border-primary/20 bg-primary/5 p-5"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-semibold">Capa contable-auditora activa</h2><p className="mt-1 text-sm text-muted-foreground">Nüva separa dato operacional, evidencia, conciliación, ajuste, cierre y papeles tributarios. Los cálculos son preparación y control interno; la declaración o presentación oficial ante SII siempre requiere la validación y autenticación correspondiente.</p></div></div></Card>
    </div>
  </ModuleGuard>;
}

function Overview({ pnl, cash, recon, payments, close, readiness }: any) {
  const open = recon.filter((x: any) => !["resolved", "matched", "passed"].includes(x.status));
  const upcoming = payments.filter((x: any) => ["planned", "due", "partial", "overdue"].includes(x.status)).slice(0, 6);
  return <div className="grid gap-4 lg:grid-cols-3">
    <Card className="p-5 lg:col-span-2"><SectionTitle icon={<BookOpenCheck />} title="Panel de control del período" /><div className="mt-4 grid gap-3 sm:grid-cols-3"><Control label="Resultado" ok={Number(pnl[0]?.net_result || 0) >= 0} text={fmtCLP(Number(pnl[0]?.net_result || 0))} /><Control label="Caja" ok={cash.reduce((s:number,x:any)=>s+Number(x.net_flow||0),0) >= 0} text={fmtCLP(cash.reduce((s:number,x:any)=>s+Number(x.net_flow||0),0))} /><Control label="Conciliaciones" ok={open.length === 0} text={open.length ? `${open.length} abiertas` : "Conciliado"} /></div><div className="mt-5"><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Readiness financiero</span><strong>{readiness}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${readiness}%` }} /></div></div></Card>
    <Card className="p-5"><SectionTitle icon={<CalendarClock />} title="Obligaciones" /><div className="mt-4 space-y-2">{upcoming.map((x:any)=><Row key={x.id} label={`${x.tax_type || x.tax_name || "Impuesto"} · ${x.due_date || "sin fecha"}`} value={fmtCLP(Math.max(0,Number(x.amount||0)-Number(x.paid_amount||0)))} badge={x.status} />)}{!upcoming.length && <Empty text="No hay obligaciones registradas." />}</div></Card>
    <Card className="p-5 lg:col-span-2"><SectionTitle icon={<AlertTriangle />} title="Excepciones que requieren atención" /><div className="mt-4 space-y-2">{open.slice(0,8).map((x:any)=><Row key={x.id} label={x.description || x.concept || x.reference || "Diferencia por revisar"} value={fmtCLP(Number(x.amount_difference || x.difference || 0))} badge={x.status} />)}{!open.length && <Empty text="No existen excepciones abiertas en los registros disponibles." />}</div></Card>
    <Card className="p-5"><SectionTitle icon={<ClipboardCheck />} title="Cierre" /><div className="mt-4 space-y-3"><div className="text-3xl font-bold">{close[0]?.total_items ? `${Math.round(Number(close[0]?.passed_items||0)/Number(close[0]?.total_items)*100)}%` : "—"}</div><p className="text-sm text-muted-foreground">Controles superados del último período disponible.</p><Badge variant="outline">{close[0]?.close_state || "Sin cierre"}</Badge></div></Card>
  </div>;
}

function Results({ pnl }: any) {
  const totals = pnl.slice(0,12).reduce((a:any,x:any)=>({ revenue:a.revenue+Number(x.revenue||x.total_revenue||0), costs:a.costs+Number(x.cost_of_sales||x.costs||0), expenses:a.expenses+Number(x.operating_expenses||x.expenses||0), result:a.result+Number(x.net_result||0)}),{revenue:0,costs:0,expenses:0,result:0});
  return <div className="space-y-4"><Card className="p-5"><SectionTitle icon={<Scale />} title="Estado de resultados · 12 períodos" /><div className="mt-4 grid gap-3 sm:grid-cols-4"><Metric label="Ingresos" value={totals.revenue} icon={<ArrowUpRight />} /><Metric label="Costos" value={totals.costs} icon={<ArrowDownRight />} /><Metric label="Gastos" value={totals.expenses} icon={<ArrowDownRight />} /><Metric label="Resultado" value={totals.result} icon={<Scale />} /></div></Card><Card className="p-5"><div className="space-y-2">{pnl.slice(0,12).map((x:any)=><Row key={`${x.business_id}-${x.period_start}`} label={new Date(x.period_start).toLocaleDateString("es-CL",{month:"long",year:"numeric"})} value={fmtCLP(Number(x.net_result||0))} badge={Number(x.net_result||0)>=0?"positivo":"negativo"} />)}{!pnl.length&&<Empty text="Aún no hay actividad suficiente para calcular el estado de resultados."/>}</div></Card></div>;
}

function CashFlow({ cash }: any) {
  const balance = cash.length ? Number(cash[0]?.ending_balance ?? cash[0]?.balance ?? 0) : 0;
  return <div className="space-y-4"><Card className="p-5"><SectionTitle icon={<Banknote />} title="Flujo de caja operativo" /><div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="Saldo último" value={balance} icon={<WalletCards />} /><Metric label="Entradas acumuladas" value={cash.reduce((s:number,x:any)=>s+Math.max(0,Number(x.inflow||0)),0)} icon={<ArrowUpRight />} /><Metric label="Salidas acumuladas" value={cash.reduce((s:number,x:any)=>s+Math.max(0,Number(x.outflow||0)),0)} icon={<ArrowDownRight />} /></div></Card><Card className="p-5"><div className="space-y-2">{cash.slice(0,90).map((x:any)=><Row key={`${x.business_id}-${x.flow_date}`} label={x.flow_date} value={fmtCLP(Number(x.net_flow||0))} badge={Number(x.net_flow||0)>=0?"entrada neta":"salida neta"} />)}{!cash.length&&<Empty text="Aún no existen movimientos suficientes para proyectar caja."/>}</div></Card></div>;
}

function TaxControl({ papers, payments, pnl }: any) {
  const f29 = papers.filter((x:any)=>String(x.section||"").toLowerCase().includes("f29") || String(x.tax_type||"").toLowerCase().includes("iva"));
  const renta = papers.filter((x:any)=>String(x.section||"").toLowerCase().includes("f22") || String(x.tax_type||"").toLowerCase().includes("renta"));
  return <div className="grid gap-4 lg:grid-cols-2"><Card className="p-5"><SectionTitle icon={<ReceiptText />} title="F29 · IVA · PPM" /><p className="mt-2 text-sm text-muted-foreground">Preparación mensual, respaldo de valores y diferencias antes de declarar.</p><div className="mt-4 space-y-2">{f29.slice(0,12).map((x:any)=><Row key={x.id} label={`${x.tax_year} · ${x.section||"IVA"} · ${x.concept||"Concepto"}`} value={fmtCLP(Number(x.taxable_amount||x.amount||0))} badge={x.status} />)}{!f29.length&&<Empty text="No hay papeles F29/IVA registrados todavía."/>}</div></Card><Card className="p-5"><SectionTitle icon={<FileCheck2 />} title="Renta · F22 · papeles de trabajo" /><p className="mt-2 text-sm text-muted-foreground">Puente entre resultado contable, ajustes tributarios, PPM y base de renta.</p><div className="mt-4 space-y-2">{renta.slice(0,12).map((x:any)=><Row key={x.id} label={`${x.tax_year} · ${x.concept||"Renta"}`} value={fmtCLP(Number(x.taxable_amount||x.amount||0))} badge={x.status} />)}{!renta.length&&<Empty text="No hay papeles F22 registrados todavía."/>}</div><div className="mt-4 rounded-lg border p-3 text-sm">Resultado contable disponible: <strong>{fmtCLP(Number(pnl[0]?.net_result||0))}</strong></div></Card><Card className="p-5 lg:col-span-2"><SectionTitle icon={<CalendarClock />} title="Calendario y pagos tributarios" /><div className="mt-4 space-y-2">{payments.slice(0,18).map((x:any)=><Row key={x.id} label={`${x.tax_type||x.tax_name||"Obligación"} · ${x.due_date||"—"}`} value={fmtCLP(Math.max(0,Number(x.amount||0)-Number(x.paid_amount||0)))} badge={x.status} />)}{!payments.length&&<Empty text="Registra obligaciones para activar el calendario tributario."/>}</div></Card></div>;
}

function CloseControl({ close, recon, bank }: any) {
  return <div className="grid gap-4 lg:grid-cols-3"><Card className="p-5 lg:col-span-2"><SectionTitle icon={<ClipboardCheck />} title="Checklist de cierre contable" /><div className="mt-4 space-y-2">{close.slice(0,12).map((x:any)=><Row key={`${x.business_id}-${x.period_end}`} label={`Período ${x.period_end}`} value={`${x.passed_items||0}/${x.total_items||0} controles`} badge={x.close_state} />)}{!close.length&&<Empty text="No existe un cierre generado para este negocio."/>}</div></Card><Card className="p-5"><SectionTitle icon={<Landmark />} title="Conciliación bancaria" /><div className="mt-4 space-y-2">{bank.slice(0,8).map((x:any)=><Row key={x.id} label={`${x.account_name||"Cuenta"} · ${x.period_end}`} value={fmtCLP(Number(x.difference||0))} badge={x.status} />)}{!bank.length&&<Empty text="Sin sesiones bancarias registradas."/>}</div></Card><Card className="p-5 lg:col-span-3"><SectionTitle icon={<ShieldCheck />} title="Trazabilidad y auditoría" /><div className="mt-4 grid gap-3 sm:grid-cols-3"><Control label="Conciliaciones abiertas" ok={recon.filter((x:any)=>!['resolved','matched','passed'].includes(x.status)).length===0} text={String(recon.filter((x:any)=>!['resolved','matched','passed'].includes(x.status)).length)} /><Control label="Bloqueos críticos" ok={recon.filter((x:any)=>['blocked','exception'].includes(x.status)).length===0} text={String(recon.filter((x:any)=>['blocked','exception'].includes(x.status)).length)} /><Control label="Integridad" ok text="RLS por negocio" /></div></Card></div>;
}

function Kpi({ title, value, icon, good, detail }: any) { return <Card className="p-4"><div className="flex justify-between gap-3"><div><div className="text-xs text-muted-foreground">{title}</div><div className="mt-1 text-xl font-bold">{value}</div>{detail&&<div className="mt-1 text-[11px] text-muted-foreground">{detail}</div>}</div><div className={`h-fit rounded-xl p-2 ${good?"bg-success/10 text-success":"bg-destructive/10 text-destructive"}`}>{icon}</div></div></Card>; }
function Metric({label,value,icon}:{label:string;value:number;icon:any}){return <div className="rounded-xl border p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><div className="mt-1 text-lg font-semibold">{fmtCLP(value)}</div></div>}
function Control({label,ok,text}:{label:string;ok:boolean;text:string}){return <div className="rounded-xl border p-4"><div className="flex items-center gap-2 text-sm font-medium">{ok?<CheckCircle2 className="h-4 w-4 text-success"/>:<AlertTriangle className="h-4 w-4 text-destructive"/>}{label}</div><div className="mt-1 text-sm text-muted-foreground">{text}</div></div>}
function SectionTitle({icon,title}:{icon:any;title:string}){return <div className="flex items-center gap-2"><span className="text-primary">{icon}</span><h2 className="font-semibold">{title}</h2></div>}
function Row({label,value,badge}:{label:string;value:string;badge?:string}){return <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span className="truncate">{label}</span><div className="flex shrink-0 items-center gap-2"><strong>{value}</strong>{badge&&<Badge variant="outline">{badge}</Badge>}</div></div>}
function Empty({text}:{text:string}){return <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{text}</p>}
