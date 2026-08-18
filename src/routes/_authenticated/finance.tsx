import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ModuleGuard } from "@/components/module-guard";
import { useBizList, useBizInsert, useBizDelete, useBizUpdate, fmtCLP } from "@/lib/biz-data";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BookOpenCheck, Calculator,
  CheckCircle2, ClipboardCheck, Download, FileDown, Plus, Receipt, ShieldCheck,
  Sparkles, Trash2, TrendingDown, TrendingUp, Wallet, XCircle,
} from "lucide-react";
import { downloadCsv } from "@/lib/export";
import { generateMonthlyReportPdf } from "@/lib/monthly-report";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finanzas y Contabilidad — Nüva One" }] }),
  component: Finance,
});

type Section = "overview" | "results" | "cash" | "accounting" | "tax";
const EXPENSES = ["Insumos", "Mercadería", "Equipamiento", "Arriendo", "Servicios", "Marketing", "Remuneraciones", "Impuestos", "Otro"];
const INCOMES = ["Ventas", "Servicios", "Otros ingresos"];
const DEFAULT_ACCOUNTS = [
  ["1.01", "Caja y efectivo", "asset", "cash"], ["1.02", "Bancos", "asset", "bank"], ["1.03", "Clientes por cobrar", "asset", "receivables"],
  ["1.04", "IVA crédito fiscal", "asset", "iva_credit"], ["1.05", "Existencias", "asset", "inventory"], ["2.01", "Proveedores", "liability", "payables"],
  ["2.02", "IVA débito fiscal", "liability", "iva_debit"], ["2.03", "Impuestos por pagar", "liability", "tax_payable"], ["3.01", "Patrimonio", "equity", "equity"],
  ["4.01", "Ingresos por ventas", "revenue", "sales"], ["4.02", "Otros ingresos", "other_income", "other_income"], ["5.01", "Costo de ventas", "cost_of_sales", "cogs"],
  ["6.01", "Gastos operacionales", "expense", "operating_expense"], ["6.02", "Gastos de personal", "expense", "payroll"], ["6.03", "Gastos financieros", "expense", "finance_expense"],
];

function monthBounds(year: number, month: number) {
  return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) };
}

function Finance() {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const canAdmin = role === "owner" || role === "admin";
  const [section, setSection] = useState<Section>("overview");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [period, setPeriod] = useState("30");
  const [scenario, setScenario] = useState("base");
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<"income" | "expense">("expense");
  const [movementCategory, setMovementCategory] = useState(EXPENSES[0]);
  const [otherCategory, setOtherCategory] = useState("");
  const [journalOpen, setJournalOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);

  const { data: transactions = [], isLoading } = useBizList<any>("transactions", { order: "tx_date" });
  const { data: sales = [] } = useBizList<any>("sales", { order: "sale_date" });
  const { data: purchases = [] } = useBizList<any>("purchases", { order: "purchase_date" });
  const { data: accounts = [] } = useBizList<any>("accounting_accounts", { order: "code", ascending: true });
  const { data: ledger = [] } = useBizList<any>("v_financial_account_balances", { order: "code", ascending: true });
  const { data: journals = [] } = useBizList<any>("accounting_journals", { order: "entry_date" });
  const { data: periods = [] } = useBizList<any>("tax_periods", { order: "period_year" });
  const { data: f29 = [] } = useBizList<any>("tax_f29_returns");
  const { data: f22 = [] } = useBizList<any>("tax_annual_returns", { order: "tax_year" });
  const { data: taxDocs = [] } = useBizList<any>("tax_supporting_documents", { order: "document_date" });
  const { data: profiles = [] } = useBizList<any>("tax_profiles");
  const { data: forecasts = [] } = useBizList<any>("cash_flow_forecasts", { order: "flow_date" });

  const insertTx = useBizInsert("transactions");
  const insertForecast = useBizInsert("cash_flow_forecasts");
  const deleteForecast = useBizDelete("cash_flow_forecasts");
  const insertDoc = useBizInsert("tax_supporting_documents");
  const updateProfile = useBizUpdate("tax_profiles");

  const bounds = monthBounds(year, month);
  const monthSales = useMemo(() => sales.filter((s: any) => {
    const d = new Date(s.sale_date);
    return d >= bounds.start && d < bounds.end && s.status !== "cancelled";
  }), [sales, year, month]);
  const monthPurchases = useMemo(() => purchases.filter((p: any) => {
    const d = new Date(p.purchase_date);
    return d >= bounds.start && d < bounds.end && p.status !== "cancelled";
  }), [purchases, year, month]);
  const monthTx = useMemo(() => transactions.filter((t: any) => {
    const d = new Date(t.tx_date);
    return d >= bounds.start && d < bounds.end;
  }), [transactions, year, month]);

  const totals = useMemo(() => {
    const income = transactions.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const expense = transactions.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    return { income, expense, net: income - expense };
  }, [transactions]);

  const pnl = useMemo(() => {
    const salesTotal = monthSales.reduce((s: number, x: any) => s + Number(x.total || 0), 0);
    const purchasesTotal = monthPurchases.reduce((s: number, x: any) => s + Number(x.total || 0), 0);
    const expenses = monthTx.filter((x: any) => x.type === "expense").reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
    const otherIncome = monthTx.filter((x: any) => x.type === "income").reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
    const gross = salesTotal - purchasesTotal;
    return { salesTotal, purchasesTotal, expenses, otherIncome, gross, result: gross - expenses + otherIncome };
  }, [monthSales, monthPurchases, monthTx]);

  const receivables = useMemo(() => {
    const credits = sales.filter((s: any) => s.is_credit && s.status !== "cancelled");
    const pending = credits.reduce((s: number, x: any) => s + Math.max(0, Number(x.total || 0) - Number(x.paid_amount || 0)), 0);
    const overdue = credits.filter((x: any) => x.due_date && new Date(x.due_date) < new Date() && Number(x.paid_amount || 0) < Number(x.total || 0)).reduce((s: number, x: any) => s + Math.max(0, Number(x.total || 0) - Number(x.paid_amount || 0)), 0);
    return { pending, overdue };
  }, [sales]);

  const taxTotals = useMemo(() => {
    const salesDocs = taxDocs.filter((d: any) => ["dte_sale", "credit_note", "debit_note"].includes(d.document_type));
    const purchaseDocs = taxDocs.filter((d: any) => d.document_type === "dte_purchase");
    const outputIva = salesDocs.reduce((s: number, d: any) => s + Number(d.iva_amount || 0), 0);
    const inputIva = purchaseDocs.reduce((s: number, d: any) => s + Number(d.iva_amount || 0), 0);
    return {
      salesNet: salesDocs.reduce((s: number, d: any) => s + Number(d.net_amount || 0), 0),
      purchasesNet: purchaseDocs.reduce((s: number, d: any) => s + Number(d.net_amount || 0), 0),
      outputIva, inputIva, ivaToPay: Math.max(0, outputIva - inputIva),
    };
  }, [taxDocs]);

  const forecast = useMemo(() => {
    const rows = forecasts.filter((f: any) => f.scenario === scenario && f.status !== "cancelled");
    const inflows = rows.filter((f: any) => f.flow_type === "inflow").reduce((s: number, f: any) => s + Number(f.amount || 0) * Number(f.probability || 100) / 100, 0);
    const outflows = rows.filter((f: any) => f.flow_type === "outflow").reduce((s: number, f: any) => s + Number(f.amount || 0) * Number(f.probability || 100) / 100, 0);
    return { inflows, outflows, net: inflows - outflows };
  }, [forecasts, scenario]);

  async function saveMovement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const category = movementCategory === "Otro" ? otherCategory.trim() || "Otro" : movementCategory;
    await insertTx.mutateAsync({ type: movementType, category, amount: Number(fd.get("amount")), description: fd.get("description"), tx_date: fd.get("tx_date") || undefined });
    setMovementOpen(false);
    setOtherCategory("");
  }

  async function seedAccounts() {
    if (!active || accounts.length) return;
    const { error } = await supabase.from("accounting_accounts").insert(DEFAULT_ACCOUNTS.map(([code, name, account_type, system_key]) => ({ business_id: active.id, code, name, account_type, system_key })));
    if (error) toast.error(error.message); else toast.success("Plan de cuentas base creado");
  }

  async function prepareF29() {
    if (!active || !canAdmin) return;
    const existing = periods.find((p: any) => p.period_year === year && p.period_month === month + 1);
    if (existing) return toast.info("Ese período F29 ya está creado");
    const { data: periodRow, error } = await supabase.from("tax_periods").insert({ business_id: active.id, period_year: year, period_month: month + 1, status: "calculated" }).select().single();
    if (error) return toast.error(error.message);
    const ppmRate = Number(profiles[0]?.ppm_rate || 0);
    const ppm = pnl.salesTotal * ppmRate / 100;
    const { error: f29Error } = await supabase.from("tax_f29_returns").insert({
      business_id: active.id, tax_period_id: periodRow.id, sales_taxable_net: taxTotals.salesNet,
      debit_iva: taxTotals.outputIva, credit_iva: taxTotals.inputIva, iva_to_pay: taxTotals.ivaToPay,
      ppm_base: pnl.salesTotal, ppm_rate: ppmRate || null, ppm_amount: ppm, total_to_pay: taxTotals.ivaToPay + ppm,
      total_documents: taxDocs.length,
    });
    if (f29Error) toast.error(f29Error.message); else toast.success("Borrador F29 preparado para revisión");
  }

  async function prepareF22() {
    if (!active || !canAdmin) return;
    const { error } = await supabase.from("tax_annual_returns").upsert({
      business_id: active.id, tax_year: year, status: "draft", accounting_result: pnl.result,
      tax_result: pnl.result, taxable_base: Math.max(0, pnl.result), ppm_credits: 0, other_credits: 0,
    }, { onConflict: "business_id,tax_year" });
    if (error) toast.error(error.message); else toast.success(`Carpeta de Renta ${year} preparada`);
  }

  return <ModuleGuard module="finance">
    <PageHeader title="Finanzas y Contabilidad" description="Estado de resultados, flujo de caja, contabilidad y cumplimiento tributario" action={<div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => downloadCsv("movimientos-financieros.csv", transactions.map((t: any) => ({ fecha: t.tx_date, tipo: t.type, categoria: t.category, monto: t.amount, descripcion: t.description })))}><Download className="mr-1.5 h-4 w-4" /> CSV</Button>
      <Button variant="outline" disabled={!monthTx.length} onClick={() => generateMonthlyReportPdf(active?.name ?? "Negocio", monthTx, `${month + 1}/${year}`)}><FileDown className="mr-1.5 h-4 w-4" /> PDF</Button>
      {canWrite && <Dialog open={movementOpen} onOpenChange={setMovementOpen}><DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" /> Movimiento</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Registrar movimiento de caja</DialogTitle></DialogHeader><form onSubmit={saveMovement} className="space-y-4">
        <select value={movementType} onChange={(e) => { const v = e.target.value as "income" | "expense"; setMovementType(v); setMovementCategory(v === "income" ? INCOMES[0] : EXPENSES[0]); }} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="income">Ingreso</option><option value="expense">Gasto</option></select>
        <select value={movementCategory} onChange={(e) => setMovementCategory(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">{(movementType === "income" ? INCOMES : EXPENSES).map((x) => <option key={x}>{x}</option>)}</select>
        {movementCategory === "Otro" && <Input value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)} placeholder="Categoría" />}
        <div className="grid grid-cols-2 gap-3"><div><Label>Fecha</Label><Input name="tx_date" type="date" /></div><div><Label>Monto CLP</Label><Input name="amount" type="number" min="1" required /></div></div>
        <Input name="description" placeholder="Descripción" /><Button className="w-full">Registrar</Button>
      </form></DialogContent></Dialog>}
    </div>} />

    <div className="mb-5 flex gap-2 overflow-x-auto border-b pb-2">
      {([["overview", "Resumen", Activity], ["results", "Estado de resultados", TrendingUp], ["cash", "Flujo de caja", Wallet], ["accounting", "Contabilidad", BookOpenCheck], ["tax", "F29 · IVA · Renta", Receipt]] as const).map(([key, label, Icon]) => <button key={key} onClick={() => setSection(key)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${section === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><Icon className="h-4 w-4" />{label}</button>)}
    </div>

    {section === "overview" && <Overview totals={totals} pnl={pnl} receivables={receivables} periods={periods} f29={f29} f22={f22} taxDocs={taxDocs} />}
    {section === "results" && <Results year={year} month={month} setYear={setYear} setMonth={setMonth} pnl={pnl} ledger={ledger} sales={monthSales} purchases={monthPurchases} transactions={monthTx} />}
    {section === "cash" && <CashFlow period={period} setPeriod={setPeriod} scenario={scenario} setScenario={setScenario} forecasts={forecasts} forecast={forecast} receivables={receivables} canWrite={canWrite} insertForecast={insertForecast} deleteForecast={deleteForecast} />}
    {section === "accounting" && <Accounting accounts={accounts} ledger={ledger} journals={journals} canWrite={canWrite} canAdmin={canAdmin} seedAccounts={seedAccounts} journalOpen={journalOpen} setJournalOpen={setJournalOpen} />}
    {section === "tax" && <TaxCenter year={year} setYear={setYear} profile={profiles[0]} periods={periods} f29={f29} f22={f22} docs={taxDocs} totals={taxTotals} canAdmin={canAdmin} prepareF29={prepareF29} prepareF22={prepareF22} insertDoc={insertDoc} docOpen={docOpen} setDocOpen={setDocOpen} updateProfile={updateProfile} />}
  </ModuleGuard>;
}

function Overview({ totals, pnl, receivables, periods, f29, f22, taxDocs }: any) {
  return <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <Metric label="Ingresos acumulados" value={fmtCLP(totals.income)} icon={<ArrowUpRight />} tone="success" />
    <Metric label="Gastos acumulados" value={fmtCLP(totals.expense)} icon={<ArrowDownRight />} tone="danger" />
    <Metric label="Flujo neto" value={fmtCLP(totals.net)} icon={<Wallet />} tone={totals.net >= 0 ? "success" : "danger"} />
    <Metric label="Documentos tributarios" value={String(taxDocs.length)} icon={<Receipt />} tone="neutral" />
  </div><div className="grid gap-4 lg:grid-cols-2">
    <Card className="p-5"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Nüva Financial Pulse</h2><p className="text-sm text-muted-foreground">Resultado, liquidez y cumplimiento.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Signal label="Resultado mensual" value={fmtCLP(pnl.result)} ok={pnl.result >= 0} /><Signal label="Por cobrar" value={fmtCLP(receivables.pending)} ok={receivables.pending === 0} /><Signal label="F29 abiertos" value={String(periods.length - f29.length)} ok={periods.length <= f29.length} /><Signal label="Renta preparada" value={String(f22.length)} ok={f22.length > 0} /></div></Card>
    <Card className="p-5"><h2 className="font-semibold">Control profesional</h2><p className="mt-1 text-sm text-muted-foreground">Nüva organiza la evidencia y calcula papeles de trabajo; la presentación oficial ante SII debe revisarse según el régimen tributario y la situación particular.</p><div className="mt-4 space-y-2"><Check label="Ventas y compras" ok /><Check label="IVA débito/crédito" ok={taxDocs.length > 0} /><Check label="Documentos respaldados" ok={taxDocs.length > 0} /><Check label="Períodos F29 preparados" ok={periods.length === 0 || f29.length >= periods.length} /></div></Card>
  </div></div>;
}

function Results({ year, month, setYear, setMonth, pnl, ledger, sales, purchases, transactions }: any) {
  return <div className="space-y-4"><Card className="p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">Estado de Resultados</h2><p className="text-sm text-muted-foreground">Ingresos, costo de ventas, gastos y resultado del período.</p></div><div className="flex gap-2"><Input className="w-24" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /><select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="rounded-md border bg-background px-3 py-2 text-sm">{Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{new Date(2020, i, 1).toLocaleDateString("es-CL", { month: "long" })}</option>)}</select></div></div><div className="mt-5 space-y-1"><Line label="Ingresos por ventas" value={pnl.salesTotal} /><Line label="(-) Costo de ventas / compras" value={pnl.purchasesTotal} /><Separator /><Line label="Utilidad bruta" value={pnl.gross} strong /><Line label="(-) Gastos operacionales" value={pnl.expenses} /><Line label="(+) Otros ingresos" value={pnl.otherIncome} /><Separator /><Line label="Resultado del período" value={pnl.result} strong positive={pnl.result >= 0} /></div></Card><div className="grid gap-4 md:grid-cols-3"><MiniStat label="Ventas" value={sales.length} /><MiniStat label="Compras" value={purchases.length} /><MiniStat label="Movimientos" value={transactions.length} /></div><Card className="p-5"><h2 className="font-semibold">Mayor contable</h2>{ledger.length ? <div className="mt-4 grid gap-2 md:grid-cols-2">{ledger.filter((x: any) => ["revenue", "cost_of_sales", "expense", "other_income"].includes(x.account_type)).map((x: any) => <div key={x.account_id} className="flex justify-between rounded-lg border p-3 text-sm"><span>{x.code} · {x.name}</span><strong>{fmtCLP(Number(x.balance))}</strong></div>)}</div> : <EmptyState title="Sin asientos publicados" description="El resultado operacional se calcula desde Ventas, Compras y Caja hasta que exista contabilidad publicada." />}</Card></div>;
}

function CashFlow({ period, setPeriod, scenario, setScenario, forecasts, forecast, receivables, canWrite, insertForecast, deleteForecast }: any) {
  const [futureOpen, setFutureOpen] = useState(false);
  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-4"><Metric label="Cobranza pendiente" value={fmtCLP(receivables.pending)} icon={<ArrowUpRight />} tone="success" /><Metric label="Vencido" value={fmtCLP(receivables.overdue)} icon={<AlertTriangle />} tone={receivables.overdue ? "danger" : "neutral"} /><Metric label="Entradas proyectadas" value={fmtCLP(forecast.inflows)} icon={<TrendingUp />} tone="success" /><Metric label="Salidas proyectadas" value={fmtCLP(forecast.outflows)} icon={<TrendingDown />} tone="danger" /></div><Card className="p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">Flujo de caja completo</h2><p className="text-sm text-muted-foreground">Histórico, proyección, probabilidad y escenarios.</p></div><div className="flex gap-2"><select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm"><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option><option value="365">365 días</option><option value="all">Todo</option></select><select value={scenario} onChange={(e) => setScenario(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm"><option value="base">Base</option><option value="conservative">Conservador</option><option value="optimistic">Optimista</option></select></div></div><div className="mt-5 grid gap-3 md:grid-cols-3"><Insight label="Flujo futuro neto" value={fmtCLP(forecast.net)} text="Entradas ponderadas por probabilidad menos salidas." /><Insight label="Horizonte" value={`Últimos ${period === "all" ? "históricos" : period + " días"}`} text="Usa la caja histórica junto con la proyección." /><Insight label="Riesgo de liquidez" value={receivables.overdue > 0 ? "Alto" : forecast.net < 0 ? "Vigilar" : "Controlado"} text="Combina cobranza vencida y flujo proyectado." /></div></Card><div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]"><Card className="p-5"><h2 className="font-semibold">Plan de caja</h2><div className="mt-4 space-y-2">{forecasts.filter((f: any) => f.scenario === scenario).slice(0, 30).map((f: any) => <div key={f.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><div><div className="font-medium">{f.category} · {f.description || "Sin detalle"}</div><div className="text-xs text-muted-foreground">{new Date(f.flow_date).toLocaleDateString("es-CL")} · {f.probability}% · {f.status}</div></div><div className="flex items-center gap-2"><strong className={f.flow_type === "inflow" ? "text-success" : "text-destructive"}>{f.flow_type === "inflow" ? "+" : "−"}{fmtCLP(Number(f.amount))}</strong>{canWrite && <Button size="icon" variant="ghost" onClick={() => deleteForecast.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button>}</div></div>)}{!forecasts.length && <EmptyState title="Sin proyección" description="Agrega IVA, sueldos, proveedores, cobranzas, inversiones y otros flujos futuros." />}</div></Card><Card className="p-5"><div className="flex justify-between"><h2 className="font-semibold">Nuevo flujo</h2><Dialog open={futureOpen} onOpenChange={setFutureOpen}><DialogTrigger asChild><Button size="icon" variant="outline"><Plus className="h-4 w-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Agregar flujo futuro</DialogTitle></DialogHeader><form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await insertForecast.mutateAsync({ flow_date: fd.get("date"), flow_type: fd.get("type"), category: fd.get("category"), description: fd.get("description"), amount: Number(fd.get("amount")), probability: Number(fd.get("probability")), scenario }); setFutureOpen(false); }} className="space-y-3"><select name="type" className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="inflow">Entrada</option><option value="outflow">Salida</option></select><Input name="date" type="date" required /><Input name="category" placeholder="IVA, sueldo, cliente..." required /><Input name="description" placeholder="Detalle" /><Input name="amount" type="number" min="0" required placeholder="Monto CLP" /><Input name="probability" type="number" min="0" max="100" defaultValue="100" /><Button className="w-full" disabled={!canWrite}>Guardar proyección</Button></form></DialogContent></Dialog></div><p className="mt-2 text-sm text-muted-foreground">Registra obligaciones y cobros futuros para anticipar faltantes de caja.</p></Card></div></div>;
}

function Accounting({ accounts, ledger, journals, canWrite, canAdmin, seedAccounts, journalOpen, setJournalOpen }: any) {
  return <div className="space-y-4"><Card className="p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">Contabilidad</h2><p className="text-sm text-muted-foreground">Plan de cuentas, libro diario, mayor y asientos cuadrados.</p></div>{canAdmin && !accounts.length && <Button variant="outline" onClick={seedAccounts}><Calculator className="mr-1.5 h-4 w-4" /> Crear plan base</Button>}{canWrite && <Dialog open={journalOpen} onOpenChange={setJournalOpen}><DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" /> Asiento</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Nuevo asiento contable</DialogTitle></DialogHeader><JournalForm accounts={accounts} close={() => setJournalOpen(false)} /></DialogContent></Dialog>}</div>{accounts.length ? <div className="mt-5 grid gap-2 md:grid-cols-3">{accounts.map((a: any) => <div key={a.id} className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{a.code}</div><div className="font-medium">{a.name}</div><div className="text-xs text-muted-foreground">{a.account_type}</div></div>)}</div> : <div className="mt-4"><EmptyState title="Plan contable no configurado" description="Crea el plan base para comenzar la contabilidad." /></div>}</Card><Card className="p-5"><h2 className="font-semibold">Mayor</h2>{ledger.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2">Cuenta</th><th className="pb-2 text-right">Debe</th><th className="pb-2 text-right">Haber</th><th className="pb-2 text-right">Saldo</th></tr></thead><tbody>{ledger.map((x: any) => <tr key={x.account_id} className="border-b last:border-0"><td className="py-2">{x.code} · {x.name}</td><td className="py-2 text-right">{fmtCLP(Number(x.debits))}</td><td className="py-2 text-right">{fmtCLP(Number(x.credits))}</td><td className="py-2 text-right font-semibold">{fmtCLP(Number(x.balance))}</td></tr>)}</tbody></table></div> : <EmptyState title="Sin movimientos contables" description="Los asientos publicados aparecerán aquí." />}</Card><Card className="p-5"><h2 className="font-semibold">Libro diario</h2><div className="mt-4 space-y-2">{journals.slice(0, 20).map((j: any) => <div key={j.id} className="flex justify-between rounded-lg border p-3 text-sm"><div><div className="font-medium">{j.description}</div><div className="text-xs text-muted-foreground">{new Date(j.entry_date).toLocaleDateString("es-CL")}</div></div><Badge variant="outline">{j.status}</Badge></div>)}{!journals.length && <EmptyState title="Sin asientos" description="Registra el primer asiento para comenzar el libro diario." />}</div></Card></div>;
}

function JournalForm({ accounts, close }: { accounts: any[]; close: () => void }) {
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const debit = Number(fd.get("debit")); const credit = Number(fd.get("credit"));
    if (!debit || debit !== credit) return toast.error("El asiento debe estar cuadrado: Debe = Haber");
    const businessId = (await supabase.auth.getUser()).data.user?.id;
    if (!businessId) return;
    const { data: memberships } = await supabase.from("business_members").select("business_id").eq("user_id", businessId).limit(1);
    const business = memberships?.[0]?.business_id;
    if (!business) return toast.error("No hay negocio activo");
    const { data: journal, error } = await supabase.from("accounting_journals").insert({ business_id: business, entry_date: fd.get("date") || undefined, description: fd.get("description") || "Asiento manual", source_type: "manual", status: "posted" }).select().single();
    if (error) return toast.error(error.message);
    const { error: lineError } = await supabase.from("accounting_lines").insert([
      { business_id: business, journal_id: journal.id, account_id: fd.get("debit_account"), debit, credit: 0 },
      { business_id: business, journal_id: journal.id, account_id: fd.get("credit_account"), debit: 0, credit },
    ]);
    if (lineError) return toast.error(lineError.message);
    close(); toast.success("Asiento publicado");
  }
  return <form onSubmit={submit} className="space-y-3"><Input name="date" type="date" /><Input name="description" placeholder="Glosa" required /><select name="debit_account" required className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Cuenta Debe</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select><select name="credit_account" required className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="">Cuenta Haber</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select><div className="grid grid-cols-2 gap-2"><Input name="debit" type="number" min="0" placeholder="Debe" required /><Input name="credit" type="number" min="0" placeholder="Haber" required /></div><Button className="w-full">Publicar asiento</Button></form>;
}

function TaxCenter({ year, setYear, profile, periods, f29, f22, docs, totals, canAdmin, prepareF29, prepareF22, insertDoc, docOpen, setDocOpen, updateProfile }: any) {
  const [ppm, setPpm] = useState(String(profile?.ppm_rate ?? ""));
  return <div className="space-y-4"><Card className="p-5"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Cumplimiento tributario Chile</h2><p className="text-sm text-muted-foreground">F29, IVA, Renta F22, respaldos y papeles de trabajo. No se guardan credenciales del SII.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-4"><MiniStat label="Régimen" value={profile?.tax_regime ?? "Pro Pyme General"} /><MiniStat label="IVA débito" value={fmtCLP(totals.outputIva)} /><MiniStat label="IVA crédito" value={fmtCLP(totals.inputIva)} /><MiniStat label="IVA estimado" value={fmtCLP(totals.ivaToPay)} /></div>{canAdmin && <div className="mt-4 flex flex-wrap items-end gap-3"><div><Label>PPM %</Label><Input className="mt-1 w-28" value={ppm} onChange={(e) => setPpm(e.target.value)} /></div><Button variant="outline" onClick={() => profile && updateProfile.mutate({ id: profile.id, patch: { ppm_rate: Number(ppm) } })}>Guardar PPM</Button><div><Label>Año</Label><Input className="mt-1 w-28" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div></div>}</Card><div className="grid gap-4 lg:grid-cols-2"><Card className="p-5"><div className="flex justify-between gap-3"><div><h2 className="font-semibold">F29 · IVA · PPM</h2><p className="text-sm text-muted-foreground">Preparación mensual, cálculo y trazabilidad.</p></div><Button onClick={prepareF29} disabled={!canAdmin}>Preparar F29</Button></div><div className="mt-4 space-y-2">{periods.slice().reverse().slice(0, 12).map((p: any) => <F29Row key={p.id} period={p} result={f29.find((x: any) => x.tax_period_id === p.id)} />)}{!periods.length && <EmptyState title="Sin períodos F29" description="Prepara el período mensual para iniciar el expediente." />}</div></Card><Card className="p-5"><div className="flex justify-between gap-3"><div><h2 className="font-semibold">Renta · F22</h2><p className="text-sm text-muted-foreground">Resultado tributario, base imponible, IDPC y créditos.</p></div><Button variant="outline" onClick={prepareF22} disabled={!canAdmin}>Preparar Renta</Button></div><div className="mt-4 space-y-2">{f22.slice().reverse().slice(0, 6).map((r: any) => <div key={r.id} className="rounded-lg border p-3"><div className="flex justify-between"><span>Año tributario {r.tax_year}</span><Badge variant="outline">{r.status}</Badge></div><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div>Resultado<br /><strong>{fmtCLP(Number(r.accounting_result))}</strong></div><div>Base imponible<br /><strong>{fmtCLP(Number(r.taxable_base))}</strong></div></div></div>)}{!f22.length && <EmptyState title="Sin carpeta de Renta" description="Prepara el expediente anual cuando corresponda." />}</div></Card></div><Card className="p-5"><div className="flex justify-between gap-3"><div><h2 className="font-semibold">Expediente documental</h2><p className="text-sm text-muted-foreground">DTE, RCV, comprobantes, declaraciones y pagos.</p></div><Dialog open={docOpen} onOpenChange={setDocOpen}><DialogTrigger asChild><Button variant="outline"><Plus className="mr-1.5 h-4 w-4" /> Respaldo</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Registrar respaldo tributario</DialogTitle></DialogHeader><form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await insertDoc.mutateAsync({ document_type: fd.get("type"), document_date: fd.get("date") || null, document_number: fd.get("number") || null, counterparty_rut: fd.get("rut") || null, counterparty_name: fd.get("name") || null, net_amount: Number(fd.get("net") || 0), exempt_amount: Number(fd.get("exempt") || 0), iva_amount: Number(fd.get("iva") || 0), total_amount: Number(fd.get("total") || 0), file_name: fd.get("file") || null, status: "validated" }); setDocOpen(false); }} className="space-y-3"><select name="type" className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="dte_sale">DTE venta</option><option value="dte_purchase">DTE compra</option><option value="credit_note">Nota de crédito</option><option value="debit_note">Nota de débito</option><option value="bank_statement">Cartola bancaria</option><option value="payment_receipt">Comprobante de pago</option><option value="f29_receipt">Comprobante F29</option><option value="f22_receipt">Comprobante F22</option><option value="declaration">Declaración jurada</option><option value="other">Otro</option></select><Input name="date" type="date" /><Input name="number" placeholder="Folio / número" /><div className="grid grid-cols-2 gap-2"><Input name="rut" placeholder="RUT" /><Input name="name" placeholder="Proveedor / cliente" /></div><div className="grid grid-cols-2 gap-2"><Input name="net" type="number" placeholder="Neto" /><Input name="iva" type="number" placeholder="IVA" /></div><div className="grid grid-cols-2 gap-2"><Input name="exempt" type="number" placeholder="Exento" /><Input name="total" type="number" placeholder="Total" /></div><Input name="file" placeholder="Nombre del respaldo" /><Button className="w-full">Guardar</Button></form></DialogContent></Dialog></div><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2">Fecha</th><th className="pb-2">Tipo</th><th className="pb-2">Folio</th><th className="pb-2">Contraparte</th><th className="pb-2 text-right">Total</th></tr></thead><tbody>{docs.slice().reverse().slice(0, 50).map((d: any) => <tr key={d.id} className="border-b last:border-0"><td className="py-2">{d.document_date ? new Date(d.document_date).toLocaleDateString("es-CL") : "—"}</td><td className="py-2">{d.document_type}</td><td className="py-2">{d.document_number || "—"}</td><td className="py-2">{d.counterparty_name || d.counterparty_rut || "—"}</td><td className="py-2 text-right">{fmtCLP(Number(d.total_amount || 0))}</td></tr>)}</tbody></table>{!docs.length && <div className="py-8"><EmptyState title="Sin respaldos" description="Agrega DTE y comprobantes para construir el expediente." /></div>}</div></Card><Card className="border-primary/20 bg-primary/5 p-5"><div className="flex gap-3"><ClipboardCheck className="h-5 w-5 text-primary" /><p className="text-sm text-muted-foreground">El módulo sigue la estructura del RCV, F29 y F22 del SII. Antes de presentar o rectificar, Nüva debe contrastar el régimen tributario, documentación, débitos, créditos, PPM, retenciones y demás partidas aplicables.</p></div></Card></div>;
}

function F29Row({ period, result }: any) { return <div className="rounded-lg border p-3"><div className="flex justify-between"><span className="font-medium">{String(period.period_month).padStart(2, "0")}/{period.period_year}</span><Badge variant="outline">{period.status}</Badge></div><div className="mt-2 grid grid-cols-3 gap-2 text-xs"><div>Débito<br /><strong>{fmtCLP(Number(result?.debit_iva || 0))}</strong></div><div>Crédito<br /><strong>{fmtCLP(Number(result?.credit_iva || 0))}</strong></div><div>Total<br /><strong>{fmtCLP(Number(result?.total_to_pay || 0))}</strong></div></div></div>; }
function Metric({ label, value, icon, tone }: any) { const cls = tone === "success" ? "bg-success/10 text-success" : tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"; return <Card className="p-5"><div className="flex items-start justify-between"><div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div><div className={`rounded-xl p-2 ${cls}`}>{icon}</div></div></Card>; }
function Signal({ label, value, ok }: any) { return <div className="rounded-xl border p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground">{ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}{label}</div><div className="mt-1 font-semibold">{value}</div></div>; }
function Check({ label, ok }: any) { return <div className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>{label}</span>{ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-warning" />}</div>; }
function Line({ label, value, strong, positive }: any) { return <div className={`flex justify-between py-2 ${strong ? "font-bold" : "text-sm"}`}><span>{label}</span><span className={positive ? "text-success" : ""}>{fmtCLP(Number(value || 0))}</span></div>; }
function MiniStat({ label, value }: any) { return <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-semibold">{value}</div></div>; }
function Insight({ label, value, text }: any) { return <div className="rounded-xl border bg-muted/20 p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-lg font-bold">{value}</div><p className="mt-1 text-xs text-muted-foreground">{text}</p></div>; }
