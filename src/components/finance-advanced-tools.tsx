import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Calculator, CircleDollarSign, Clock3, ExternalLink, Landmark, Receipt, ShieldCheck, TrendingUp, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBizList, fmtCLP } from "@/lib/biz-data";

type Tab = "treasury" | "receivables" | "posting" | "tools";
const money = (v: unknown) => fmtCLP(Math.round(Number(v || 0)));

export function FinanceAdvancedTools() {
  const [tab, setTab] = useState<Tab>("treasury");
  const { data: treasury = [] } = useBizList<any>("v_financial_treasury_daily", { order: "flow_date", ascending: true });
  const { data: queue = [] } = useBizList<any>("financial_posting_queue", { order: "created_at", ascending: false });
  const { data: sales = [] } = useBizList<any>("sales", { order: "sale_date", ascending: false });
  const { data: taxPayments = [] } = useBizList<any>("tax_payments", { order: "due_date", ascending: true });

  const receivables = useMemo(() => {
    const rows = sales.filter((s: any) => s.is_credit && s.status !== "cancelled");
    return rows.map((s: any) => ({
      ...s,
      pending: Math.max(0, Number(s.total || 0) - Number(s.paid_amount || 0)),
    })).filter((s: any) => s.pending > 0).sort((a: any, b: any) => b.pending - a.pending);
  }, [sales]);

  const treasurySummary = useMemo(() => {
    const rows = treasury as any[];
    const inflow = rows.reduce((s, x) => s + Number(x.inflow || 0), 0);
    const outflow = rows.reduce((s, x) => s + Number(x.outflow || 0), 0);
    return { inflow, outflow, net: inflow - outflow };
  }, [treasury]);

  const queueSummary = useMemo(() => {
    const pending = queue.filter((x: any) => ["pending", "blocked"].includes(x.status));
    return {
      count: pending.length,
      amount: pending.reduce((s: number, x: any) => s + Number(x.gross_amount || 0), 0),
      blocked: pending.filter((x: any) => x.status === "blocked").length,
    };
  }, [queue]);

  const receivableSummary = useMemo(() => ({
    amount: receivables.reduce((s: number, x: any) => s + Number(x.pending || 0), 0),
    overdue: receivables.filter((x: any) => x.due_date && new Date(x.due_date) < new Date()).reduce((s: number, x: any) => s + Number(x.pending || 0), 0),
  }), [receivables]);

  const taxDue = useMemo(() => taxPayments
    .filter((x: any) => ["planned", "due", "overdue", "partial"].includes(x.status))
    .reduce((s: number, x: any) => s + Math.max(0, Number(x.amount || 0) - Number(x.paid_amount || 0)), 0), [taxPayments]);

  const tabs: [Tab, string, any][] = [
    ["treasury", "Tesorería", WalletCards],
    ["receivables", "Por cobrar", CircleDollarSign],
    ["posting", "Pendientes contables", ShieldCheck],
    ["tools", "Herramientas", Calculator],
  ];

  return <Card className="overflow-hidden">
    <div className="border-b p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Control financiero avanzado</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">Herramientas recuperadas para caja, cartera, clasificación contable y decisiones de precio.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto">{tabs.map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setTab(key)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
      </div>
    </div>

    {tab === "treasury" && <div className="space-y-5 p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Entradas registradas" value={money(treasurySummary.inflow)} icon={ArrowUpRight} />
        <Metric label="Salidas + obligaciones" value={money(treasurySummary.outflow)} icon={ArrowDownRight} />
        <Metric label="Flujo neto" value={money(treasurySummary.net)} icon={TrendingUp} good={treasurySummary.net >= 0} />
      </div>
      {taxDue > 0 && <div className="flex items-start gap-3 rounded-xl border p-4 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><div><b>{money(taxDue)}</b> de obligaciones tributarias están consideradas en la vista de tesorería.</div></div>}
      {!treasury.length ? <Empty text="Todavía no hay movimientos de tesorería registrados." /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Fecha</th><th className="p-2 text-right">Entradas</th><th className="p-2 text-right">Salidas</th><th className="p-2 text-right">Neto</th></tr></thead><tbody>{treasury.slice(-12).reverse().map((x: any) => <tr key={`${x.flow_date}-${x.business_id}`} className="border-b last:border-0"><td className="p-2">{new Date(x.flow_date).toLocaleDateString("es-CL")}</td><td className="p-2 text-right">{money(x.inflow)}</td><td className="p-2 text-right">{money(x.outflow)}</td><td className={`p-2 text-right font-medium ${Number(x.net_flow) >= 0 ? "" : "text-destructive"}`}>{money(x.net_flow)}</td></tr>)}</tbody></table></div>}
    </div>}

    {tab === "receivables" && <div className="space-y-5 p-5">
      <div className="grid gap-3 md:grid-cols-2"><Metric label="Cartera pendiente" value={money(receivableSummary.amount)} icon={CircleDollarSign} /><Metric label="Vencido" value={money(receivableSummary.overdue)} icon={Clock3} good={receivableSummary.overdue === 0} /></div>
      {!receivables.length ? <Empty text="No hay cuentas por cobrar pendientes." /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Cliente</th><th className="p-2">Vencimiento</th><th className="p-2 text-right">Pendiente</th><th className="p-2">Estado</th></tr></thead><tbody>{receivables.slice(0, 20).map((x: any) => { const overdue = x.due_date && new Date(x.due_date) < new Date(); return <tr key={x.id} className="border-b last:border-0"><td className="p-2 font-medium">{x.customer_name || x.customer || "Cliente"}</td><td className="p-2">{x.due_date ? new Date(x.due_date).toLocaleDateString("es-CL") : "Sin vencimiento"}</td><td className="p-2 text-right font-medium">{money(x.pending)}</td><td className="p-2"><Badge variant={overdue ? "destructive" : "outline"}>{overdue ? "Vencido" : "Pendiente"}</Badge></td></tr>; })}</tbody></table></div>}
    </div>}

    {tab === "posting" && <div className="space-y-5 p-5">
      <div className="grid gap-3 md:grid-cols-3"><Metric label="Pendientes" value={String(queueSummary.count)} icon={Clock3} good={queueSummary.count === 0} /><Metric label="Monto por clasificar" value={money(queueSummary.amount)} icon={Receipt} /><Metric label="Bloqueados" value={String(queueSummary.blocked)} icon={ShieldCheck} good={queueSummary.blocked === 0} /></div>
      <div className="rounded-xl border p-4 text-sm text-muted-foreground">La cola separa el registro operativo de la contabilización: ningún movimiento se publica automáticamente cuando falta clasificación contable o tributaria.</div>
      {!queue.length ? <Empty text="La cola contable está limpia." /> : <div className="space-y-2">{queue.slice(0, 12).map((x: any) => <div key={x.id} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Badge variant={x.status === "blocked" ? "destructive" : "outline"}>{x.status}</Badge><span className="font-medium capitalize">{x.source_type === "sale" ? "Venta" : "Compra"}</span></div><p className="mt-1 text-xs text-muted-foreground">{x.reason || "Revisión contable pendiente"}</p></div><span className="font-semibold">{money(x.gross_amount)}</span></div>)}</div>}
    </div>}

    {tab === "tools" && <div className="grid gap-4 p-5 md:grid-cols-2">
      <Tool title="Calculadora inteligente de precios" description="Piso de precio, margen, punto de equilibrio y recomendación conectada al contexto de productos." href="/pricing-calculator" icon={Calculator} />
      <Tool title="Control de costos" description="Costos fijos, variables, vencimientos, IVA, centros de costo y análisis por categoría." href="/purchases" icon={Receipt} />
      <Tool title="Contabilidad profesional" description="Plan de cuentas, diario, mayor, estados financieros, IVA, documentos y cierre." href="#contabilidad" icon={Landmark} />
      <Tool title="Control tributario Chile" description="IVA, F29, documentación de respaldo, pagos y controles de cierre." href="#tributario" icon={ShieldCheck} />
    </div>}
  </Card>;
}

function Metric({ label, value, icon: Icon, good }: { label: string; value: string; icon: any; good?: boolean }) {
  return <Card className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></div><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className={`text-lg font-bold ${good === false ? "text-destructive" : ""}`}>{value}</p></div></div></Card>;
}

function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</div>; }

function Tool({ title, description, href, icon: Icon }: { title: string; description: string; href: string; icon: any }) {
  const external = href.startsWith("http");
  return <div className="rounded-xl border p-5"><div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div><div className="min-w-0 flex-1"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p>{href.startsWith("#") ? <p className="mt-3 text-xs text-muted-foreground">Disponible en el espacio contable de esta misma página.</p> : <Button asChild variant="outline" size="sm" className="mt-3"><a href={href}>{external ? <ExternalLink className="mr-1.5 h-4 w-4" /> : null}Abrir herramienta</a></Button>}</div></div></div>;
}
