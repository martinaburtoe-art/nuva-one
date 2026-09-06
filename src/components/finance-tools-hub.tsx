import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CircleDollarSign,
  Clock3,
  Landmark,
  Receipt,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBizList, fmtCLP } from "@/lib/biz-data";
import { buildFinanceGuardian } from "@/lib/nuva-finance-guardian";
import { buildCashflowForecast } from "@/lib/nuva-cashflow-forecast";

type ToolKey =
  | "treasury"
  | "receivables"
  | "payables"
  | "posting"
  | "intelligence"
  | "pricing"
  | "costs"
  | "accounting";

const money = (v: unknown) => fmtCLP(Math.round(Number(v || 0)));
const taxOf = (row: any) => Number(row?.tax ?? row?.iva_amount ?? row?.vat_amount ?? row?.iva ?? 0);

const tools: Array<{ key: ToolKey; title: string; description: string; icon: typeof WalletCards }> = [
  { key: "treasury", title: "Tesorería", description: "Entradas, salidas, flujo neto y obligaciones que afectan la caja.", icon: WalletCards },
  { key: "receivables", title: "Cuentas por cobrar", description: "Controla cartera pendiente, vencimientos y clientes con deuda.", icon: CircleDollarSign },
  { key: "payables", title: "Cuentas por pagar", description: "Visualiza compromisos, vencimientos y pagos pendientes a proveedores.", icon: ArrowDownRight },
  { key: "posting", title: "Pendientes contables", description: "Revisa movimientos que requieren clasificación antes de contabilizarse.", icon: ShieldCheck },
  { key: "intelligence", title: "Inteligencia financiera", description: "Guardian, IVA estimado y pronóstico de caja a 30 días.", icon: Sparkles },
  { key: "pricing", title: "Calculadora de precios", description: "Define precio mínimo, margen y punto de equilibrio.", icon: Calculator },
  { key: "costs", title: "Control de costos", description: "Analiza costos y compromisos para entender el margen real.", icon: Receipt },
  { key: "accounting", title: "Contabilidad y tributación", description: "Accede al workspace profesional de contabilidad, IVA y documentos.", icon: Landmark },
];

function Metric({ label, value, icon: Icon, good }: { label: string; value: string; icon: typeof TrendingUp; good?: boolean }) {
  return <Card className="p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{label}</span><Icon className={`h-4 w-4 ${good === false ? "text-destructive" : "text-primary"}`} /></div><p className="mt-2 text-xl font-semibold">{value}</p></Card>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

export function FinanceToolsHub() {
  const [selected, setSelected] = useState<ToolKey | null>(null);
  const { data: treasury = [] } = useBizList<any>("v_financial_treasury_daily", { order: "flow_date", ascending: true });
  const { data: queue = [] } = useBizList<any>("financial_posting_queue", { order: "created_at", ascending: false });
  const { data: sales = [] } = useBizList<any>("sales", { order: "sale_date", ascending: false });
  const { data: purchases = [] } = useBizList<any>("purchases", { order: "purchase_date", ascending: false });
  const { data: taxPayments = [] } = useBizList<any>("tax_payments", { order: "due_date", ascending: true });
  const { data: transactions = [] } = useBizList<any>("transactions", { order: "tx_date", ascending: false });

  const receivables = useMemo(() => sales.filter((s: any) => s.is_credit && s.status !== "cancelled").map((s: any) => ({ ...s, pending: Math.max(0, Number(s.total || 0) - Number(s.paid_amount || 0)) })).filter((s: any) => s.pending > 0).sort((a: any, b: any) => b.pending - a.pending), [sales]);
  const payables = useMemo(() => purchases.filter((p: any) => p.status !== "cancelled").map((p: any) => ({ ...p, pending: Math.max(0, Number(p.total || 0) - Number(p.paid_amount || 0)) })).filter((p: any) => p.pending > 0).sort((a: any, b: any) => b.pending - a.pending), [purchases]);
  const treasurySummary = useMemo(() => { const rows = treasury as any[]; const inflow = rows.reduce((s, x) => s + Number(x.inflow || 0), 0); const outflow = rows.reduce((s, x) => s + Number(x.outflow || 0), 0); return { inflow, outflow, net: inflow - outflow }; }, [treasury]);
  const queueSummary = useMemo(() => { const pending = queue.filter((x: any) => ["pending", "blocked"].includes(x.status)); return { count: pending.length, amount: pending.reduce((s: number, x: any) => s + Number(x.gross_amount || 0), 0), blocked: pending.filter((x: any) => x.status === "blocked").length }; }, [queue]);
  const receivableSummary = useMemo(() => ({ amount: receivables.reduce((s: number, x: any) => s + x.pending, 0), overdue: receivables.filter((x: any) => x.due_date && new Date(x.due_date) < new Date()).reduce((s: number, x: any) => s + x.pending, 0) }), [receivables]);
  const payableSummary = useMemo(() => ({ amount: payables.reduce((s: number, x: any) => s + x.pending, 0), overdue: payables.filter((x: any) => x.due_date && new Date(x.due_date) < new Date()).reduce((s: number, x: any) => s + x.pending, 0) }), [payables]);
  const taxDue = useMemo(() => taxPayments.filter((x: any) => ["planned", "due", "overdue", "partial"].includes(x.status)).reduce((s: number, x: any) => s + Math.max(0, Number(x.amount || 0) - Number(x.paid_amount || 0)), 0), [taxPayments]);
  const currentOperationalCash = useMemo(() => transactions.reduce((s: number, x: any) => s + (x.type === "income" ? Number(x.amount || 0) : -Number(x.amount || 0)), 0), [transactions]);
  const guardian = useMemo(() => buildFinanceGuardian({ sales: sales.filter((s: any) => s.status !== "cancelled").map((s: any) => ({ total: Number(s.total || 0), tax: taxOf(s), date: String(s.sale_date || "") })), purchases: purchases.filter((p: any) => p.status !== "cancelled").map((p: any) => ({ total: Number(p.total || 0), tax: taxOf(p), date: String(p.purchase_date || "") })), receivables: receivables.map((s: any) => ({ amount: s.pending, dueDate: String(s.due_date || "2099-12-31"), paid: false })), payables: payables.map((p: any) => ({ amount: p.pending, dueDate: String(p.due_date || "2099-12-31"), paid: false })), cash: currentOperationalCash }), [sales, purchases, receivables, payables, currentOperationalCash]);
  const forecast = useMemo(() => buildCashflowForecast({ currentBalance: currentOperationalCash, items: [...receivables.map((s: any) => ({ amount: s.pending, dueDate: String(s.due_date || ""), kind: "inflow" as const, status: "open" as const })), ...payables.map((p: any) => ({ amount: p.pending, dueDate: String(p.due_date || ""), kind: "outflow" as const, status: "open" as const })), ...taxPayments.filter((x: any) => ["planned", "due", "overdue", "partial"].includes(x.status)).map((x: any) => ({ amount: Math.max(0, Number(x.amount || 0) - Number(x.paid_amount || 0)), dueDate: String(x.due_date || ""), kind: "outflow" as const, status: "open" as const }))] }), [currentOperationalCash, receivables, payables, taxPayments]);

  const openTool = (key: ToolKey) => {
    if (key === "pricing") { window.location.href = "/pricing-calculator"; return; }
    if (key === "costs") { window.location.href = "/purchases"; return; }
    setSelected(key);
  };

  if (selected) {
    return <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Finanzas · Herramienta</p><h2 className="text-2xl font-semibold">{tools.find(t => t.key === selected)?.title}</h2><p className="mt-1 text-sm text-muted-foreground">{tools.find(t => t.key === selected)?.description}</p></div>
        <Button variant="outline" onClick={() => setSelected(null)}><X className="mr-2 h-4 w-4" />Volver a Finanzas</Button>
      </div>

      {selected === "treasury" && <Card className="space-y-5 p-5"><div className="grid gap-3 md:grid-cols-3"><Metric label="Entradas registradas" value={money(treasurySummary.inflow)} icon={ArrowUpRight} /><Metric label="Salidas" value={money(treasurySummary.outflow)} icon={ArrowDownRight} /><Metric label="Flujo neto" value={money(treasurySummary.net)} icon={TrendingUp} good={treasurySummary.net >= 0} /></div>{taxDue > 0 && <div className="rounded-xl border p-4 text-sm"><b>{money(taxDue)}</b> de obligaciones tributarias están consideradas en tesorería.</div>}{!treasury.length ? <Empty text="Todavía no hay movimientos de tesorería registrados." /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Fecha</th><th className="p-2 text-right">Entradas</th><th className="p-2 text-right">Salidas</th><th className="p-2 text-right">Neto</th></tr></thead><tbody>{treasury.slice(-30).reverse().map((x: any) => <tr key={`${x.flow_date}-${x.business_id}`} className="border-b last:border-0"><td className="p-2">{new Date(x.flow_date).toLocaleDateString("es-CL")}</td><td className="p-2 text-right">{money(x.inflow)}</td><td className="p-2 text-right">{money(x.outflow)}</td><td className="p-2 text-right font-medium">{money(x.net_flow)}</td></tr>)}</tbody></table></div>}</Card>}

      {selected === "receivables" && <Card className="space-y-5 p-5"><div className="grid gap-3 md:grid-cols-2"><Metric label="Cartera pendiente" value={money(receivableSummary.amount)} icon={CircleDollarSign} /><Metric label="Vencido" value={money(receivableSummary.overdue)} icon={Clock3} good={receivableSummary.overdue === 0} /></div>{!receivables.length ? <Empty text="No hay cuentas por cobrar pendientes." /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Cliente</th><th className="p-2">Vencimiento</th><th className="p-2 text-right">Pendiente</th><th className="p-2">Estado</th></tr></thead><tbody>{receivables.slice(0, 30).map((x: any) => { const overdue = x.due_date && new Date(x.due_date) < new Date(); return <tr key={x.id} className="border-b last:border-0"><td className="p-2 font-medium">{x.customer_name || x.customer || "Cliente"}</td><td className="p-2">{x.due_date ? new Date(x.due_date).toLocaleDateString("es-CL") : "Sin vencimiento"}</td><td className="p-2 text-right font-medium">{money(x.pending)}</td><td className="p-2"><Badge variant={overdue ? "destructive" : "outline"}>{overdue ? "Vencido" : "Pendiente"}</Badge></td></tr>; })}</tbody></table></div>}</Card>}

      {selected === "payables" && <Card className="space-y-5 p-5"><div className="grid gap-3 md:grid-cols-2"><Metric label="Por pagar" value={money(payableSummary.amount)} icon={ArrowDownRight} /><Metric label="Vencido" value={money(payableSummary.overdue)} icon={Clock3} good={payableSummary.overdue === 0} /></div>{!payables.length ? <Empty text="No hay cuentas por pagar pendientes." /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Proveedor</th><th className="p-2">Vencimiento</th><th className="p-2 text-right">Pendiente</th><th className="p-2">Estado</th></tr></thead><tbody>{payables.slice(0, 30).map((x: any) => { const overdue = x.due_date && new Date(x.due_date) < new Date(); return <tr key={x.id} className="border-b last:border-0"><td className="p-2 font-medium">{x.supplier_name || x.supplier || "Proveedor"}</td><td className="p-2">{x.due_date ? new Date(x.due_date).toLocaleDateString("es-CL") : "Sin vencimiento"}</td><td className="p-2 text-right font-medium">{money(x.pending)}</td><td className="p-2"><Badge variant={overdue ? "destructive" : "outline"}>{overdue ? "Vencido" : "Pendiente"}</Badge></td></tr>; })}</tbody></table></div>}</Card>}

      {selected === "posting" && <Card className="space-y-5 p-5"><div className="grid gap-3 md:grid-cols-3"><Metric label="Pendientes" value={String(queueSummary.count)} icon={Clock3} good={queueSummary.count === 0} /><Metric label="Monto por clasificar" value={money(queueSummary.amount)} icon={Receipt} /><Metric label="Bloqueados" value={String(queueSummary.blocked)} icon={ShieldCheck} good={queueSummary.blocked === 0} /></div><div className="rounded-xl border p-4 text-sm text-muted-foreground">Los movimientos permanecen fuera de la contabilización hasta que exista clasificación contable o tributaria suficiente.</div>{!queue.length ? <Empty text="La cola contable está limpia." /> : <div className="space-y-2">{queue.slice(0, 30).map((x: any) => <div key={x.id} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Badge variant={x.status === "blocked" ? "destructive" : "outline"}>{x.status}</Badge><span className="font-medium">{x.source_type === "sale" ? "Venta" : "Compra"}</span></div><p className="mt-1 text-xs text-muted-foreground">{x.reason || "Revisión contable pendiente"}</p></div><span className="font-semibold">{money(x.gross_amount)}</span></div>)}</div>}</Card>}

      {selected === "intelligence" && <div className="space-y-4"><div className="grid gap-3 md:grid-cols-3"><Metric label="IVA estimado" value={money(guardian.estimatedVat)} icon={Receipt} /><Metric label="Caja a 30 días" value={money(forecast.projectedBalance30d)} icon={TrendingUp} good={forecast.risk !== "high"} /><Metric label="Mínimo proyectado" value={money(forecast.minimumProjectedBalance30d)} icon={ShieldCheck} good={forecast.minimumProjectedBalance30d >= 0} /></div><div className="grid gap-4 lg:grid-cols-2"><Card className="p-5"><h3 className="font-semibold">Nüva Finance Guardian</h3><p className="mt-1 text-xs text-muted-foreground">Señales explicables de IVA, cartera y liquidez.</p><div className="mt-4 space-y-3">{guardian.signals.length ? guardian.signals.slice(0, 8).map(s => <div key={s.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><span className="font-medium">{s.title}</span><Badge variant={s.severity === "critical" ? "destructive" : "outline"}>{s.severity}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{s.detail}</p></div>) : <Empty text="No se detectaron señales prioritarias." />}</div></Card><Card className="p-5"><h3 className="font-semibold">Pronóstico de caja</h3><p className="mt-1 text-xs text-muted-foreground">Proyección automática con cartera, pagos y obligaciones conocidas.</p><div className="mt-4 rounded-xl border p-4 space-y-1 text-sm"><p>Riesgo: <b className="capitalize">{forecast.risk}</b></p><p>Caja operacional actual: <b>{money(forecast.currentBalance)}</b></p><p>Caja proyectada: <b>{money(forecast.projectedBalance30d)}</b></p>{forecast.runwayDays !== null && <p>Runway estimado: <b>{forecast.runwayDays} días</b></p>}</div>{forecast.actions.length > 0 && <div className="mt-4 space-y-2">{forecast.actions.map(action => <div key={action} className="rounded-lg border p-3 text-sm">{action}</div>)}</div>}</Card></div></div>}

      {selected === "accounting" && <Card className="p-6"><h3 className="text-lg font-semibold">Contabilidad y tributación</h3><p className="mt-1 text-sm text-muted-foreground">El workspace profesional de contabilidad permanece disponible como herramienta independiente.</p><Button className="mt-5" onClick={() => { window.location.hash = "contabilidad"; window.location.reload(); }}>Abrir workspace contable</Button></Card>}
    </div>;
  }

  return <section className="space-y-5">
    <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Centro financiero</p><h2 className="mt-1 text-2xl font-semibold">Herramientas de Finanzas</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Cada herramienta está separada para que puedas entrar directamente a la función que necesitas, sin mezclar paneles.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{tools.map(({ key, title, description, icon: Icon }) => <Card key={key} className="group flex min-h-[180px] flex-col justify-between p-5 transition-shadow hover:shadow-md"><div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p></div><Button variant="outline" className="mt-5 w-full" onClick={() => openTool(key)}>Abrir herramienta</Button></Card>)}</div>
  </section>;
}
