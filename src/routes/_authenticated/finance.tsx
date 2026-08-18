import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ModuleGuard } from "@/components/module-guard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BookOpenCheck, Calculator,
  CalendarDays, CheckCircle2, ClipboardCheck, Download, FileDown, FileText, Landmark,
  Plus, Receipt, Search, ShieldCheck, Sparkles, Trash2, TrendingDown, TrendingUp,
  Wallet, XCircle,
} from "lucide-react";
import { useBizList, useBizInsert, useBizDelete, useBizUpdate, fmtCLP } from "@/lib/biz-data";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/export";
import { generateMonthlyReportPdf } from "@/lib/monthly-report";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finanzas y Contabilidad — Nüva One" }] }),
  component: Finance,
});

type Section = "overview" | "resultados" | "flujo" | "contabilidad" | "tributario";
const EXPENSE_CATEGORIES = ["Insumos", "Mercadería para reventa", "Equipamiento", "Arriendo", "Servicios", "Marketing", "Remuneraciones", "Impuestos", "Otro"];
const INCOME_CATEGORIES = ["Ventas", "Servicios prestados", "Otros ingresos"];
const DEFAULT_ACCOUNTS = [
  ["1.01", "Caja y efectivo", "asset", "cash"], ["1.02", "Bancos", "asset", "bank"], ["1.03", "Clientes por cobrar", "asset", "receivables"],
  ["1.04", "IVA crédito fiscal", "asset", "iva_credit"], ["1.05", "Existencias", "asset", "inventory"], ["2.01", "Proveedores", "liability", "payables"],
  ["2.02", "IVA débito fiscal", "liability", "iva_debit"], ["2.03", "Impuestos por pagar", "liability", "tax_payable"], ["3.01", "Patrimonio", "equity", "equity"],
  ["4.01", "Ingresos por ventas", "revenue", "sales"], ["4.02", "Otros ingresos", "other_income", "other_income"], ["5.01", "Costo de ventas", "cost_of_sales", "cogs"],
  ["6.01", "Gastos de operación", "expense", "operating_expense"], ["6.02", "Gastos de personal", "expense", "payroll"], ["6.03", "Gastos financieros", "expense", "finance_expense"],
];

function dateDaysAgo(days: number) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - days); return d;
}
function monthBounds(year: number, month: number) {
  return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) };
}
function fmtMonth(year: number, month: number) { return new Date(year, month, 1).toLocaleDateString("es-CL", { month: "long", year: "numeric" }); }

function Finance() {
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);
  const canAdmin = myRole === "owner" || myRole === "admin";
  const { active } = useActiveBusiness();
  const [section, setSection] = useState<Section>("overview");
  const [period, setPeriod] = useState<"7" | "30" | "90" | "365" | "all">("30");
  const [openTx, setOpenTx] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [otherCategory, setOtherCategory] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [cashScenario, setCashScenario] = useState<"base" | "conservative" | "optimistic">("base");
  const [journalOpen, setJournalOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);

  const { data: tx, isLoading: txLoading } = useBizList<any>("transactions", { order: "tx_date" });
  const { data: sales } = useBizList<any>("sales", { order: "sale_date" });
  const { data: purchases } = useBizList<any>("purchases", { order: "purchase_date" });
  const { data: accounts } = useBizList<any>("accounting_accounts", { order: "code", ascending: true });
  const { data: ledger } = useBizList<any>("v_financial_account_balances", { order: "code", ascending: true });
  const { data: journals } = useBizList<any>("accounting_journals", { order: "entry_date" });
  const { data: taxPeriods } = useBizList<any>("tax_periods", { order: "period_year" });
  const { data: f29 } = useBizList<any>("tax_f29_returns");
  const { data: f22 } = useBizList<any>("tax_annual_returns", { order: "tax_year" });
  const { data: taxDocs } = useBizList<any>("tax_supporting_documents", { order: "document_date" });
  const { data: taxProfile } = useBizList<any>("tax_profiles");
  const { data: forecasts } = useBizList<any>("cash_flow_forecasts", { order: "flow_date" });

  const insertTx = useBizInsert("transactions");
  const deleteTx = useBizDelete("transactions");
  const insertForecast = useBizInsert("cash_flow_forecasts");
  const deleteForecast = useBizDelete("cash_flow_forecasts");
  const insertDoc = useBizInsert("tax_supporting_documents");
  const updateProfile = useBizUpdate("tax_profiles");

  const allTx = tx ?? [];
  const { income, expense, net } = useMemo(() => {
    const income = allTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = allTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    return { income, expense, net: income - expense };
  }, [allTx]);

  const selectedTx = useMemo(() => {
    if (period === "all") return allTx;
    const start = dateDaysAgo(Number(period) - 1);
    return allTx.filter((t) => new Date(t.tx_date) >= start);
  }, [allTx, period]);

  const bounds = monthBounds(year, month);
  const monthSales = useMemo(() => (sales ?? []).filter((s: any) => { const d = new Date(s.sale_date); return d >= bounds.start && d < bounds.end && s.status !== "cancelled"; }), [sales, year, month]);
  const monthPurchases = useMemo(() => (purchases ?? []).filter((p: any) => { const d = new Date(p.purchase_date); return d >= bounds.start && d < bounds.end && p.status !== "cancelled"; }), [purchases, year, month]);
  const monthTx = useMemo(() => allTx.filter((t: any) => { const d = new Date(t.tx_date); return d >= bounds.start && d < bounds.end; }), [allTx, year, month]);

  const pnl = useMemo(() => {
    const salesGross = monthSales.reduce((s, x) => s + Number(x.total || 0), 0);
    const purchasesGross = monthPurchases.reduce((s, x) => s + Number(x.total || 0), 0);
    const opExpenses = monthTx.filter((x) => x.type === "expense").reduce((s, x) => s + Number(x.amount || 0), 0);
    const otherIncome = monthTx.filter((x) => x.type === "income").reduce((s, x) => s + Number(x.amount || 0), 0);
    const grossProfit = salesGross - purchasesGross;
    return { salesGross, purchasesGross, opExpenses, otherIncome, grossProfit, result: grossProfit - opExpenses + otherIncome };
  }, [monthSales, monthPurchases, monthTx]);

  const receivables = useMemo(() => {
    const credits = (sales ?? []).filter((s: any) => s.is_credit && s.status !== "cancelled");
    const pending = credits.reduce((sum: number, s: any) => sum + Math.max(0, Number(s.total || 0) - Number(s.paid_amount || 0)), 0);
    const overdue = credits.filter((s: any) => Number(s.paid_amount || 0) < Number(s.total || 0) && s.due_date && new Date(s.due_date) < new Date()).reduce((sum: number, s: any) => sum + Math.max(0, Number(s.total || 0) - Number(s.paid_amount || 0)), 0);
    return { pending, overdue };
  }, [sales]);

  const forecast = useMemo(() => {
    const rows = (forecasts ?? []).filter((f: any) => f.scenario === cashScenario && f.status !== "cancelled");
    const inflows = rows.filter((f: any) => f.flow_type === "inflow").reduce((s: number, f: any) => s + Number(f.amount || 0) * (Number(f.probability || 100) / 100), 0);
    const outflows = rows.filter((f: any) => f.flow_type === "outflow").reduce((s: number, f: any) => s + Number(f.amount || 0) * (Number(f.probability || 100) / 100), 0);
    const confirmed = rows.filter((f: any) => f.status === "confirmed").reduce((s: number, f: any) => s + (f.flow_type === "inflow" ? 1 : -1) * Number(f.amount || 0), 0);
    return { inflows, outflows, net: inflows - outflows, confirmed };
  }, [forecasts, cashScenario]);

  const taxTotals = useMemo(() => {
    const docs = taxDocs ?? [];
    const salesNet = docs.filter((d: any) => ["dte_sale", "credit_note", "debit_note"].includes(d.document_type)).reduce((s: number, d: any) => s + Number(d.net_amount || 0), 0);
    const purchasesNet = docs.filter((d: any) => d.document_type === "dte_purchase").reduce((s: number, d: any) => s + Number(d.net_amount || 0), 0);
    const outputIva = docs.filter((d: any) => ["dte_sale", "credit_note", "debit_note"].includes(d.document_type)).reduce((s: number, d: any) => s + Number(d.iva_amount || 0), 0);
    const inputIva = docs.filter((d: any) => d.document_type === "dte_purchase").reduce((s: number, d: any) => s + Number(d.iva_amount || 0), 0);
    return { salesNet, purchasesNet, outputIva, inputIva, ivaToPay: Math.max(0, outputIva - inputIva) };
  }, [taxDocs]);

  async function onSubmitTx(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const finalCategory = category === "Otro" ? otherCategory.trim() || "Otro" : category;
    await insertTx.mutateAsync({ type: fd.get("type"), category: finalCategory, amount: Number(fd.get("amount")), description: fd.get("description"), tx_date: fd.get("tx_date") || undefined });
    setOpenTx(false); setOtherCategory("");
  }

  async function seedChart() {
    if (!active || accounts?.length) return;
    const { error } = await supabase.from("accounting_accounts").insert(DEFAULT_ACCOUNTS.map(([code, name, account_type, system_key]) => ({ business_id: active.id, code, name, account_type, system_key })));
    if (error) toast.error(error.message); else toast.success("Plan de cuentas base creado");
  }

  async function createF29() {
    if (!active) return;
    const existing = (taxPeriods ?? []).find((p: any) => p.period_year === year && p.period_month === month + 1);
    if (existing) { toast.info("El período F29 ya existe"); return; }
    const { data: periodRow, error } = await supabase.from("tax_periods").insert({ business_id: active.id, period_year: year, period_month: month + 1, status: "calculated" }).select().single();
    if (error) return toast.error(error.message);
    const ppmRate = Number(taxProfile?.[0]?.ppm_rate || 0);
    const ppm = pnl.salesGross * ppmRate / 100;
    const { error: f29Error } = await supabase.from("tax_f29_returns").insert({ business_id: active.id, tax_period_id: periodRow.id, sales_taxable_net: taxTotals.salesNet, sales_exempt_net: 0, sales_export_net: 0, debit_iva: taxTotals.outputIva, credit_iva: taxTotals.inputIva, iva_to_pay: taxTotals.ivaToPay, ppm_base: pnl.salesGross, ppm_rate: ppmRate || null, ppm_amount: ppm, total_to_pay: taxTotals.ivaToPay + ppm, total_documents: (taxDocs ?? []).length });
    if (f29Error) return toast.error(f29Error.message);
    toast.success("Borrador F29 preparado para revisión");
  }

  async function createF22() {
    if (!active) return;
    const { error } = await supabase.from("tax_annual_returns").upsert({ business_id: active.id, tax_year: year, status: "draft", accounting_result: pnl.result, tax_result: pnl.result, taxable_base: Math.max(0, pnl.result) }, { onConflict: "business_id,tax_year" });
    if (error) toast.error(error.message); else toast.success(`Carpeta de Renta ${year} preparada`);
  }

  async function createJournal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!active) return;
    const fd = new FormData(e.currentTarget); const debit = Number(fd.get("debit")); const credit = Number(fd.get("credit"));
    if (!debit || debit !== credit) return toast.error("El asiento debe estar cuadrado: Debe = Haber");
    const debitAccount = String(fd.get("debit_account")); const creditAccount = String(fd.get("credit_account"));
    const { data: journal, error } = await supabase.from("accounting_journals").insert({ business_id: active.id, entry_date: fd.get("entry_date") || undefined, description: fd.get("description") || "Asiento manual", source_type: "manual", status: "posted" }).select().single();
    if (error) return toast.error(error.message);
    const { error: lineError } = await supabase.from("accounting_lines").insert([
      { business_id: active.id, journal_id: journal.id, account_id: debitAccount, debit, credit: 0, description: String(fd.get("description") || "") },
      { business_id: active.id, journal_id: journal.id, account_id: creditAccount, debit: 0, credit, description: String(fd.get("description") || "") },
    ]);
    if (lineError) return toast.error(lineError.message);
    setJournalOpen(false); toast.success("Asiento contable registrado");
  }

  async function addForecast(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    await insertForecast.mutateAsync({ flow_date: fd.get("flow_date"), flow_type: fd.get("flow_type"), category: fd.get("forecast_category"), description: fd.get("forecast_description"), amount: Number(fd.get("forecast_amount")), probability: Number(fd.get("probability")), scenario: cashScenario });
    e.currentTarget.reset();
  }

  return (
    <ModuleGuard module="finance">
      <>
        <PageHeader title="Finanzas y Contabilidad" description="Estado de resultados, flujo de caja, contabilidad y cumplimiento tributario en un solo centro de control" action={<div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadCsv("movimientos-financieros.csv", allTx.map((t: any) => ({ fecha: t.tx_date, tipo: t.type, categoria: t.category ?? "", monto: t.amount, descripcion: t.description ?? "" })))}><Download className="mr-1.5 h-4 w-4" /> CSV</Button>
          <Button variant="outline" disabled={!monthTx.length} onClick={async () => { try { await generateMonthlyReportPdf(active?.name ?? "Negocio", monthTx, fmtMonth(year, month)); } catch { toast.error("No fue posible generar el PDF"); } }}><FileDown className="mr-1.5 h-4 w-4" /> PDF</Button>
          {canWrite && <Dialog open={openTx} onOpenChange={setOpenTx}><DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" /> Movimiento</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Registrar movimiento de caja</DialogTitle></DialogHeader><form onSubmit={onSubmitTx} className="space-y-4">
            <div><Label>Tipo</Label><select name="type" value={txType} onChange={(e) => { const v = e.target.value as "income" | "expense"; setTxType(v); setCategory(v === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]); }} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="income">Ingreso</option><option value="expense">Gasto</option></select></div>
            <div><Label>Categoría</Label><select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm">{(txType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => <option key={c}>{c}</option>)}</select>{category === "Otro" && <Input className="mt-2" placeholder="Especifica la categoría" value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)} />}</div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Fecha</Label><Input name="tx_date" type="date" /></div><div><Label>Monto CLP</Label><Input name="amount" type="number" min="1" required /></div></div>
            <div><Label>Descripción</Label><Input name="description" placeholder="Ej. arriendo, honorarios, pago proveedor..." /></div><Button className="w-full" disabled={insertTx.isPending}>{insertTx.isPending ? "Guardando..." : "Registrar"}</Button>
          </form></DialogContent></Dialog>}
        </div>} />

        <div className="mb-5 flex gap-2 overflow-x-auto border-b pb-2">
          {([["overview", "Resumen", Activity], ["resultados", "Estado de resultados", TrendingUp], ["flujo", "Flujo de caja", Wallet], ["contabilidad", "Contabilidad", BookOpenCheck], ["tributario", "F29 · IVA · Renta", Receipt]] as const).map(([key, label, Icon]) => <button key={key} onClick={() => setSection(key)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${section === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}><Icon className="h-4 w-4" />{label}</button>)}
        </div>

        {section === "overview" && <Overview income={income} expense={expense} net={net} receivables={receivables} pnl={pnl} taxPeriods={taxPeriods ?? []} f29={f29 ?? []} f22={f22 ?? []} taxDocs={taxDocs ?? []} />}
        {section === "resultados" && <Results year={year} month={month} setYear={setYear} setMonth={setMonth} pnl={pnl} ledger={ledger ?? []} monthSales={monthSales} monthPurchases={monthPurchases} monthTx={monthTx} />}
        {section === "flujo" && <CashFlow period={period} setPeriod={setPeriod} selectedTx={selectedTx} forecasts={forecasts ?? []} forecast={forecast} scenario={cashScenario} setScenario={setCashScenario} canWrite={canWrite} addForecast={addForecast} deleteForecast={deleteForecast} receivables={receivables} />}
        {section === "contabilidad" && <Accounting accounts={accounts ?? []} ledger={ledger ?? []} journals={journals ?? []} canAdmin={canAdmin} canWrite={canWrite} seedChart={seedChart} journalOpen={journalOpen} setJournalOpen={setJournalOpen} createJournal={createJournal} />}
        {section === "tributario" && <TaxCompliance year={year} setYear={setYear} taxProfile={taxProfile?.[0]} taxPeriods={taxPeriods ?? []} f29={f29 ?? []} f22={f22 ?? []} taxDocs={taxDocs ?? []} totals={taxTotals} canAdmin={canAdmin} docOpen={docOpen} setDocOpen={setDocOpen} createF29={createF29} createF22={createF22} insertDoc={insertDoc} updateProfile={updateProfile} />}
      </>
    </ModuleGuard>
  );
}

function Overview({ income, expense, net, receivables, pnl, taxPeriods, f29, f22, taxDocs }: any) {
  const openPeriods = taxPeriods.filter((p: any) => !["paid", "filed"].includes(p.status)).length;
  const missingDocs = Math.max(0, taxPeriods.length - f29.length);
  return <div className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={<ArrowUpRight className="h-5 w-5" />} label="Ingresos acumulados" value={fmtCLP(income)} tone="success" /><Metric icon={<ArrowDownRight className="h-5 w-5" />} label="Gastos acumulados" value={fmtCLP(expense)} tone="danger" /><Metric icon={<Wallet className="h-5 w-5" />} label="Flujo neto" value={fmtCLP(net)} tone={net >= 0 ? "success" : "danger"} /><Metric icon={<Receipt className="h-5 w-5" />} label="Documentos tributarios" value={String(taxDocs.length)} tone="neutral" /></div>
    <div className="grid gap-4 lg:grid-cols-2"><Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Nüva Financial Pulse</h2><p className="text-sm text-muted-foreground">Lectura ejecutiva de resultado, liquidez y cumplimiento.</p></div><Sparkles className="h-5 w-5 text-primary" /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Signal label="Resultado mensual" value={fmtCLP(pnl.result)} ok={pnl.result >= 0} /><Signal label="Por cobrar" value={fmtCLP(receivables.pending)} ok={receivables.pending === 0} /><Signal label="Períodos tributarios abiertos" value={String(openPeriods)} ok={openPeriods === 0} /><Signal label="F29 pendientes de preparar" value={String(missingDocs)} ok={missingDocs === 0} /></div></Card>
      <Card className="p-5"><h2 className="font-semibold">Control de cierre</h2><p className="mt-1 text-sm text-muted-foreground">El sistema prepara la evidencia; la presentación oficial ante SII sigue siendo responsabilidad del contribuyente o su asesor.</p><div className="mt-4 space-y-3"><Check label="Ventas y compras registradas" ok={true} /><Check label="Documentos tributarios respaldados" ok={taxDocs.length > 0} /><Check label="F29 preparado y revisado" ok={f29.some((x: any) => ["review","filed","paid"].includes(x.status))} /><Check label="Renta anual preparada" ok={f22.some((x: any) => ["review","ready","filed","paid"].includes(x.status))} /></div></Card></div>
  </div>;
}

function Results({ year, month, setYear, setMonth, pnl, ledger, monthSales, monthPurchases, monthTx }: any) {
  return <div className="space-y-4"><Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Estado de Resultados</h2><p className="text-sm text-muted-foreground">Lectura mensual de ingresos, costo de ventas, gastos y resultado.</p></div><div className="flex gap-2"><Input className="w-24" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /><select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="rounded-md border bg-background px-3 py-2 text-sm">{Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{new Date(2020, i, 1).toLocaleDateString("es-CL", { month: "long" })}</option>)}</select></div></div><div className="mt-5 space-y-2"><Line label="Ingresos por ventas" value={pnl.salesGross} positive /><Line label="(-) Costo de ventas / compras" value={pnl.purchasesGross} /><Separator /><Line label="Utilidad bruta" value={pnl.grossProfit} strong /><Line label="(-) Gastos operacionales" value={pnl.opExpenses} /><Line label="(+) Otros ingresos" value={pnl.otherIncome} positive /><Separator /><Line label="Resultado del período" value={pnl.result} strong positive={pnl.result >= 0} /></div></Card><div className="grid gap-4 md:grid-cols-3"><MiniStat label="Ventas" value={String(monthSales.length)} detail="operaciones del mes" /><MiniStat label="Compras" value={String(monthPurchases.length)} detail="operaciones del mes" /><MiniStat label="Movimientos" value={String(monthTx.length)} detail="caja y gastos" /></div><Card className="p-5"><h2 className="font-semibold">Resultado contable</h2><p className="mt-1 text-sm text-muted-foreground">Cuando existan asientos publicados, Nüva puede contrastar el resultado operacional con el mayor contable.</p>{ledger.length ? <div className="mt-4 grid gap-2 md:grid-cols-2">{ledger.filter((x: any) => ["revenue","cost_of_sales","expense","other_income","other_expense"].includes(x.account_type)).slice(0, 12).map((x: any) => <div key={x.account_id} className="flex justify-between rounded-lg border p-3 text-sm"><span>{x.code} · {x.name}</span><strong>{fmtCLP(Number(x.balance || 0))}</strong></div>)}</div> : <div className="mt-4 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Aún no hay asientos contables publicados. El estado de resultados mostrado arriba se calcula desde Ventas, Compras y Caja.</div>}</Card></div>;
}

function CashFlow({ period, setPeriod, selectedTx, forecasts, forecast, scenario, setScenario, canWrite, addForecast, deleteForecast, receivables }: any) {
  const historicalIn = selectedTx.filter((x: any) => x.type === "income").reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  const historicalOut = selectedTx.filter((x: any) => x.type === "expense").reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-4"><Metric icon={<ArrowUpRight className="h-5 w-5" />} label="Entradas históricas" value={fmtCLP(historicalIn)} tone="success" /><Metric icon={<ArrowDownRight className="h-5 w-5" />} label="Salidas históricas" value={fmtCLP(historicalOut)} tone="danger" /><Metric icon={<TrendingUp className="h-5 w-5" />} label="Proyección entradas" value={fmtCLP(forecast.inflows)} tone="success" /><Metric icon={<TrendingDown className="h-5 w-5" />} label="Proyección salidas" value={fmtCLP(forecast.outflows)} tone="danger" /></div><Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Flujo de caja completo</h2><p className="text-sm text-muted-foreground">Histórico + proyección + escenarios + cobranza.</p></div><div className="flex gap-2"><select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm"><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option><option value="365">365 días</option><option value="all">Todo</option></select><select value={scenario} onChange={(e) => setScenario(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm"><option value="base">Base</option><option value="conservative">Conservador</option><option value="optimistic">Optimista</option></select></div></div><div className="mt-5 grid gap-4 md:grid-cols-3"><Insight label="Flujo proyectado" value={fmtCLP(forecast.net)} text="Entradas ponderadas por probabilidad menos salidas ponderadas." /><Insight label="Cobranza pendiente" value={fmtCLP(receivables.pending)} text="Cartera que puede convertirse en entrada de caja." /><Insight label="Flujo confirmado" value={fmtCLP(forecast.confirmed)} text="Movimientos futuros marcados como confirmados." /></div></Card><div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]"><Card className="p-5"><h2 className="font-semibold">Planificación futura</h2><div className="mt-4 space-y-2">{forecasts.filter((f: any) => f.scenario === scenario).slice(0, 30).map((f: any) => <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><div><div className="font-medium">{f.category} · {f.description || "Sin detalle"}</div><div className="text-xs text-muted-foreground">{new Date(f.flow_date).toLocaleDateString("es-CL")} · {f.status} · {f.probability}%</div></div><div className="flex items-center gap-2"><strong className={f.flow_type === "inflow" ? "text-success" : "text-destructive"}>{f.flow_type === "inflow" ? "+" : "−"}{fmtCLP(Number(f.amount))}</strong>{canWrite && <Button size="icon" variant="ghost" onClick={() => deleteForecast.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button>}</div></div>)}{!forecasts.length && <EmptyState title="Sin proyección" description="Agrega cobros, pagos, impuestos, nóminas e inversiones para proyectar la caja." />}</div></Card><Card className="p-5"><h2 className="font-semibold">Agregar movimiento futuro</h2><form onSubmit={addForecast} className="mt-4 space-y-3"><select name="flow_type" className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="inflow">Entrada</option><option value="outflow">Salida</option></select><Input name="flow_date" type="date" required /><Input name="forecast_category" placeholder="Categoría: IVA, sueldo, cliente..." required /><Input name="forecast_description" placeholder="Detalle" /><Input name="forecast_amount" type="number" min="0" placeholder="Monto CLP" required /><Input name="probability" type="number" min="0" max="100" defaultValue="100" placeholder="Probabilidad %" /><Button className="w-full" disabled={!canWrite}>Agregar a proyección</Button></form></Card></div></div>;
}

function Accounting({ accounts, ledger, journals, canAdmin, canWrite, seedChart, journalOpen, setJournalOpen, createJournal }: any) {
  return <div className="space-y-4"><Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Contabilidad y mayor</h2><p className="text-sm text-muted-foreground">Plan de cuentas, libro diario, mayor, débitos/créditos y control de cierre.</p></div><div className="flex gap-2">{canAdmin && !accounts.length && <Button variant="outline" onClick={seedChart}><Calculator className="mr-1.5 h-4 w-4" /> Crear plan de cuentas</Button>}{canWrite && <Dialog open={journalOpen} onOpenChange={setJournalOpen}><DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" /> Nuevo asiento</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Asiento contable</DialogTitle></DialogHeader><form onSubmit={createJournal} className="space-y-3"><Input name="entry_date" type="date" /><Input name="description" placeholder="Glosa del asiento" required /><select name="debit_account" className="w-full rounded-md border bg-background px-3 py-2 text-sm" required><option value="">Cuenta Debe</option>{accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select><select name="credit_account" className="w-full rounded-md border bg-background px-3 py-2 text-sm" required><option value="">Cuenta Haber</option>{accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select><div className="grid grid-cols-2 gap-3"><Input name="debit" type="number" min="0" required placeholder="Debe" /><Input name="credit" type="number" min="0" required placeholder="Haber" /></div><Button className="w-full">Registrar asiento</Button></form></DialogContent></Dialog>}</div></div><div className="mt-5 grid gap-2 md:grid-cols-2 lg:grid-cols-3">{accounts.map((a: any) => <div key={a.id} className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{a.code}</div><div className="font-medium">{a.name}</div><div className="mt-1 text-xs text-muted-foreground">{a.account_type}</div></div>)}</div>{!accounts.length && <EmptyState title="Plan contable no configurado" description="Crea el plan de cuentas base para empezar a registrar asientos y conciliar el resultado." />}</Card><Card className="p-5"><h2 className="font-semibold">Mayor por cuenta</h2>{ledger.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2">Cuenta</th><th className="pb-2 text-right">Debe</th><th className="pb-2 text-right">Haber</th><th className="pb-2 text-right">Saldo</th></tr></thead><tbody>{ledger.map((x: any) => <tr key={x.account_id} className="border-b last:border-0"><td className="py-2">{x.code} · {x.name}</td><td className="py-2 text-right">{fmtCLP(Number(x.debits))}</td><td className="py-2 text-right">{fmtCLP(Number(x.credits))}</td><td className="py-2 text-right font-semibold">{fmtCLP(Number(x.balance))}</td></tr>)}</tbody></table></div> : <EmptyState title="Sin movimientos contables" description="Los asientos publicados aparecerán aquí." />}</Card><Card className="p-5"><h2 className="font-semibold">Libro diario</h2><div className="mt-3 space-y-2">{journals.slice(0, 20).map((j: any) => <div key={j.id} className="flex justify-between rounded-lg border p-3 text-sm"><div><div className="font-medium">{j.description}</div><div className="text-xs text-muted-foreground">{new Date(j.entry_date).toLocaleDateString("es-CL")} · {j.source_type}</div></div><Badge variant="outline">{j.status}</Badge></div>)}{!journals.length && <EmptyState title="Sin asientos" description="El libro diario se construirá con los asientos publicados." />}</div></Card></div>;
}

function TaxCompliance({ year, setYear, taxProfile, taxPeriods, f29, f22, taxDocs, totals, canAdmin, docOpen, setDocOpen, createF29, createF22, insertDoc, updateProfile }: any) {
  const [ppm, setPpm] = useState(String(taxProfile?.ppm_rate ?? ""));
  return <div className="space-y-4"><Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Cumplimiento tributario Chile</h2><p className="text-sm text-muted-foreground">Organización de F29, IVA, Renta, respaldos y papeles de trabajo. No almacena credenciales del SII.</p></div><ShieldCheck className="h-5 w-5 text-primary" /></div><div className="mt-4 grid gap-3 md:grid-cols-4"><div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Régimen</div><div className="mt-1 font-semibold">{taxProfile?.tax_regime ?? "Pro Pyme General"}</div></div><div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">IVA</div><div className="mt-1 font-semibold">{taxProfile?.vat_status ?? "IVA"}</div></div><div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Débito IVA</div><div className="mt-1 font-semibold">{fmtCLP(totals.outputIva)}</div></div><div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Crédito IVA</div><div className="mt-1 font-semibold">{fmtCLP(totals.inputIva)}</div></div></div>{canAdmin && <div className="mt-4 flex flex-wrap items-end gap-3"><div><Label>PPM % configurable</Label><Input className="mt-1 w-32" value={ppm} onChange={(e) => setPpm(e.target.value)} placeholder="Ej. 0,2" /></div><Button variant="outline" onClick={async () => { if (!taxProfile?.id) return; await updateProfile.mutateAsync({ id: taxProfile.id, patch: { ppm_rate: Number(ppm) } }); }}>Guardar PPM</Button><div><Label>Año tributario</Label><Input className="mt-1 w-28" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div></div>}</Card>
    <div className="grid gap-4 lg:grid-cols-2"><Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">F29 · IVA · PPM</h2><p className="text-sm text-muted-foreground">Preparación mensual y trazabilidad del cálculo.</p></div><Button onClick={createF29} disabled={!canAdmin}>Preparar F29</Button></div><div className="mt-4 space-y-2">{taxPeriods.slice().reverse().slice(0, 12).map((p: any) => { const r = f29.find((x: any) => x.tax_period_id === p.id); return <div key={p.id} className="rounded-lg border p-3"><div className="flex items-center justify-between"><span className="font-medium">{String(p.period_month).padStart(2,"0")}/{p.period_year}</span><Badge variant="outline">{p.status}</Badge></div><div className="mt-2 grid grid-cols-3 gap-2 text-xs"><div>Débito<br /><strong>{fmtCLP(Number(r?.debit_iva || 0))}</strong></div><div>Crédito<br /><strong>{fmtCLP(Number(r?.credit_iva || 0))}</strong></div><div>Total<br /><strong>{fmtCLP(Number(r?.total_to_pay || 0))}</strong></div></div></div>); })}{!taxPeriods.length && <EmptyState title="Sin períodos F29" description="Prepara el primer período para comenzar el expediente tributario." />}</div></Card>
      <Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Renta · F22</h2><p className="text-sm text-muted-foreground">Papeles de trabajo para resultado tributario, base imponible, IDPC y créditos.</p></div><Button variant="outline" onClick={createF22} disabled={!canAdmin}>Preparar Renta</Button></div><div className="mt-4 space-y-2">{f22.slice().reverse().slice(0, 6).map((r: any) => <div key={r.id} className="rounded-lg border p-3"><div className="flex justify-between"><span className="font-medium">Año tributario {r.tax_year}</span><Badge variant="outline">{r.status}</Badge></div><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div>Resultado contable<br /><strong>{fmtCLP(Number(r.accounting_result))}</strong></div><div>Base imponible<br /><strong>{fmtCLP(Number(r.taxable_base))}</strong></div></div></div>)}{!f22.length && <EmptyState title="Sin carpeta de Renta" description="Genera el expediente anual cuando corresponda." />}</div></Card></div>
    <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Expediente documental tributario</h2><p className="text-sm text-muted-foreground">RCV, DTE, comprobantes, declaraciones y pagos organizados por período.</p></div><Dialog open={docOpen} onOpenChange={setDocOpen}><DialogTrigger asChild><Button variant="outline"><Plus className="mr-1.5 h-4 w-4" /> Agregar respaldo</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Registrar documento tributario</DialogTitle></DialogHeader><form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await insertDoc.mutateAsync({ document_type: fd.get("document_type"), document_date: fd.get("document_date") || null, document_number: fd.get("document_number") || null, counterparty_rut: fd.get("counterparty_rut") || null, counterparty_name: fd.get("counterparty_name") || null, net_amount: Number(fd.get("net_amount") || 0), exempt_amount: Number(fd.get("exempt_amount") || 0), iva_amount: Number(fd.get("iva_amount") || 0), total_amount: Number(fd.get("total_amount") || 0), file_name: fd.get("file_name") || null, status: "validated" }); setDocOpen(false); }} className="space-y-3"><select name="document_type" className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="dte_sale">DTE venta</option><option value="dte_purchase">DTE compra</option><option value="credit_note">Nota de crédito</option><option value="debit_note">Nota de débito</option><option value="bank_statement">Cartola bancaria</option><option value="payment_receipt">Comprobante de pago</option><option value="f29_receipt">Comprobante F29</option><option value="f22_receipt">Comprobante F22</option><option value="declaration">Declaración jurada</option><option value="other">Otro</option></select><Input name="document_date" type="date" /><Input name="document_number" placeholder="Folio / número" /><div className="grid grid-cols-2 gap-2"><Input name="counterparty_rut" placeholder="RUT" /><Input name="counterparty_name" placeholder="Proveedor / cliente" /></div><div className="grid grid-cols-2 gap-2"><Input name="net_amount" type="number" placeholder="Neto" /><Input name="iva_amount" type="number" placeholder="IVA" /></div><div className="grid grid-cols-2 gap-2"><Input name="exempt_amount" type="number" placeholder="Exento" /><Input name="total_amount" type="number" placeholder="Total" /></div><Input name="file_name" placeholder="Nombre del respaldo / archivo" /><Button className="w-full">Guardar respaldo</Button></form></DialogContent></Dialog></div><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2">Fecha</th><th className="pb-2">Tipo</th><th className="pb-2">Folio</th><th className="pb-2">Contraparte</th><th className="pb-2 text-right">Total</th><th className="pb-2">Estado</th></tr></thead><tbody>{taxDocs.slice().reverse().slice(0, 50).map((d: any) => <tr key={d.id} className="border-b last:border-0"><td className="py-2">{d.document_date ? new Date(d.document_date).toLocaleDateString("es-CL") : "—"}</td><td className="py-2">{d.document_type}</td><td className="py-2">{d.document_number || "—"}</td><td className="py-2">{d.counterparty_name || d.counterparty_rut || "—"}</td><td className="py-2 text-right">{fmtCLP(Number(d.total_amount || 0))}</td><td className="py-2"><Badge variant="outline">{d.status}</Badge></td></tr>)}</tbody></table>{!taxDocs.length && <div className="py-8"><EmptyState title="Sin respaldos" description="Agrega DTE, comprobantes y declaraciones para construir el expediente." /></div>}</div></Card>
    <Card className="border-primary/20 bg-primary/5 p-5"><div className="flex gap-3"><ClipboardCheck className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-semibold">Control tributario Nüva</h2><p className="mt-1 text-sm text-muted-foreground">La arquitectura sigue la lógica de RCV, F29 y F22 del SII, con papeles de trabajo y trazabilidad. Antes de presentar o rectificar, el sistema debe validar régimen, documentación, créditos, débitos, PPM y demás partidas aplicables al contribuyente.</p></div></div></Card>
  </div>;
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "success" | "danger" | "warning" | "neutral" }) {
  const cls = tone === "success" ? "bg-success/10 text-success" : tone === "danger" ? "bg-destructive/10 text-destructive" : tone === "warning" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground";
  return <Card className="p-5"><div className="flex items-start justify-between"><div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div><div className={`rounded-xl p-2 ${cls}`}>{icon}</div></div></Card>;
}
function Signal({ label, value, ok }: any) { return <div className="rounded-xl border p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}{label}</div><div className="mt-2 text-lg font-bold">{value}</div></div>; }
function Check({ label, ok }: any) { return <div className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>{label}</span>{ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-warning" />}</div>; }
function Line({ label, value, strong, positive }: any) { return <div className={`flex justify-between py-2 ${strong ? "text-base font-bold" : "text-sm"}`}><span>{label}</span><span className={positive ? "text-success" : ""}>{fmtCLP(Number(value || 0))}</span></div>; }
function MiniStat({ label, value, detail }: any) { return <Card className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-xl font-bold">{value}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div></Card>; }
function Insight({ label, value, text }: any) { return <div className="rounded-xl border bg-muted/20 p-4"><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="mt-1 text-lg font-bold">{value}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>; }
