import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";
import { useBizList, fmtCLP } from "@/lib/biz-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, BookOpenCheck,
  CalendarClock, CheckCircle2, ClipboardCheck, FileCheck2, Landmark,
  ReceiptText, RefreshCw, Scale, ShieldCheck, WalletCards,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/financial-control")({
  head: () => ({ meta: [{ title: "Control Financiero Profesional — Nüva One" }] }),
  component: FinancialControl,
});

type Tab = "resumen" | "resultado" | "caja" | "tributario" | "cierre";

function FinancialControl() {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const [tab, setTab] = useState<Tab>("resumen");
  const [busy, setBusy] = useState(false);

  const { data: pnl = [] } = useBizList<any>("v_financial_management_pnl_monthly", { order: "period_start", ascending: false });
  const { data: cash = [] } = useBizList<any>("v_cash_flow_daily", { order: "flow_date", ascending: false });
  const { data: close = [] } = useBizList<any>("v_financial_close_status", { order: "period_end", ascending: false });
  const { data: recon = [] } = useBizList<any>("financial_reconciliation_items", { order: "period_end", ascending: false });
  const { data: bank = [] } = useBizList<any>("bank_reconciliation_sessions", { order: "period_end", ascending: false });
  const { data: papers = [] } = useBizList<any>("tax_working_papers", { order: "tax_year", ascending: false });
  const { data: payments = [] } = useBizList<any>("tax_payments", { order: "due_date" });
  const { data: f29 = [] } = useBizList<any>("tax_f29_returns", { order: "created_at", ascending: false });
  const { data: f22 = [] } = useBizList<any>("tax_annual_returns", { order: "tax_year", ascending: false });
  const { data: docs = [] } = useBizList<any>("tax_supporting_documents", { order: "document_date", ascending: false });
  const { data: journals = [] } = useBizList<any>("accounting_journals", { order: "entry_date", ascending: false });

  const latest = pnl[0];
  const latestClose = close[0];
  const latestF29 = f29[0];
  const latestF22 = f22[0];

  const cashMetrics = useMemo(() => {
    const rows = [...cash].slice(0, 90);
    const inflow = rows.reduce((s, x) => s + Number(x.inflow || 0), 0);
    const outflow = rows.reduce((s, x) => s + Number(x.outflow || 0), 0);
    const net = rows.reduce((s, x) => s + Number(x.net_flow || 0), 0);
    const ending = Number(rows[0]?.ending_balance || 0);
    return { inflow, outflow, net, ending };
  }, [cash]);

  const pnlMetrics = useMemo(() => {
    const rows = [...pnl].slice(0, 12);
    const revenue = rows.reduce((s, x) => s + Number(x.revenue || 0), 0);
    const costs = rows.reduce((s, x) => s + Number(x.cost_of_sales || 0), 0);
    const expenses = rows.reduce((s, x) => s + Number(x.operating_expenses || 0), 0);
    const result = rows.reduce((s, x) => s + Number(x.net_result || 0), 0);
    return { revenue, costs, expenses, result, margin: revenue ? (result / revenue) * 100 : 0 };
  }, [pnl]);

  const audit = useMemo(() => {
    const openRecon = recon.filter(x => ["open", "partial", "exception", "pending"].includes(x.status));
    const overdue = payments.filter(x => ["overdue"].includes(x.status));
    const unmatchedBank = bank.filter(x => Math.abs(Number(x.difference || 0)) > 0.5);
    const pendingDocs = docs.filter(x => ["pending", "missing", "review"].includes(x.status));
    return {
      critical: overdue.length + unmatchedBank.length,
      review: openRecon.length + pendingDocs.length,
      clean: overdue.length === 0 && unmatchedBank.length === 0 && openRecon.length === 0,
      openRecon, overdue, unmatchedBank, pendingDocs,
    };
  }, [recon, payments, bank, docs]);

  const taxDue = payments
    .filter(x => ["planned", "due", "overdue", "partial"].includes(x.status))
    .reduce((s, x) => s + Math.max(0, Number(x.amount || 0) - Number(x.paid_amount || 0)), 0);

  async function refreshFinancialStatus() {
    if (!active || !canWrite || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("refresh_financial_control", { p_business_id: active.id });
      if (error) throw error;
      toast.success("Control financiero actualizado");
    } catch (error: any) {
      toast.error(error?.message || "No fue posible actualizar el control financiero");
    } finally {
      setBusy(false);
    }
  }

  return <ModuleGuard module="finance">
    <PageHeader
      title="Control Financiero Profesional"
      description={`Centro de control contable, caja, conciliación y cumplimiento tributario${active ? ` · ${active.name}` : ""}`}
      action={<Button variant="outline" onClick={refreshFinancialStatus} disabled={!canWrite || busy}><RefreshCw className={`mr-1.5 h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Actualizar control</Button>}
    />

    <div className="space-y-5">
      <nav className="flex flex-wrap gap-2 rounded-xl border bg-card p-2">
        {(["resumen", "resultado", "caja", "tributario", "cierre"] as Tab[]).map(item => <Button key={item} size="sm" variant={tab === item ? "default" : "ghost"} onClick={() => setTab(item)}>{tabLabel(item)}</Button>)}
      </nav>

      {tab === "resumen" && <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Kpi title="Resultado 12 meses" value={fmtCLP(pnlMetrics.result)} icon={<Scale />} good={pnlMetrics.result >= 0} />
          <Kpi title="Margen neto" value={`${pnlMetrics.margin.toFixed(1)}%`} icon={<ArrowUpRight />} good={pnlMetrics.margin >= 0} />
          <Kpi title="Caja neta 90 días" value={fmtCLP(cashMetrics.net)} icon={<WalletCards />} good={cashMetrics.net >= 0} />
          <Kpi title="Riesgos críticos" value={String(audit.critical)} icon={<AlertTriangle />} good={audit.critical === 0} />
          <Kpi title="Impuestos pendientes" value={fmtCLP(taxDue)} icon={<ReceiptText />} good={taxDue === 0} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <HealthCard title="Auditoría automática" icon={<ShieldCheck />} status={audit.clean ? "OK" : "REVISAR"} tone={audit.clean ? "good" : "warn"}>
            <Row label="Conciliaciones abiertas" value={String(audit.openRecon.length)} />
            <Row label="Diferencias bancarias" value={String(audit.unmatchedBank.length)} />
            <Row label="Documentos por revisar" value={String(audit.pendingDocs.length)} />
            <Row label="Vencimientos tributarios" value={String(audit.overdue.length)} />
          </HealthCard>
          <HealthCard title="Cierre contable" icon={<ClipboardCheck />} status={latestClose?.close_state || "PENDIENTE"} tone={latestClose?.close_state === "ready_to_close" ? "good" : "warn"}>
            <Row label="Período" value={latestClose?.period_end || "—"} />
            <Row label="Controles aprobados" value={`${latestClose?.passed_items ?? 0}/${latestClose?.total_items ?? 0}`} />
            <Row label="Excepciones" value={String(audit.openRecon.length)} />
          </HealthCard>
          <HealthCard title="Cumplimiento tributario" icon={<FileCheck2 />} status={latestF29?.status || "SIN BORRADOR"} tone={latestF29?.status === "filed" ? "good" : "warn"}>
            <Row label="Último F29" value={latestF29?.period || latestF29?.tax_period_id || "—"} />
            <Row label="Total F29" value={fmtCLP(Number(latestF29?.total_to_pay || 0))} />
            <Row label="Renta" value={latestF22?.status || "No preparada"} />
          </HealthCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ListCard title="Alertas que requieren atención" icon={<AlertTriangle />}>
            {audit.openRecon.slice(0, 6).map(x => <Row key={x.id} label={x.description || x.concept || "Diferencia de conciliación"} value={fmtCLP(Number(x.difference_amount || x.amount || 0))} badge="REVISAR" />)}
            {audit.unmatchedBank.slice(0, 4).map(x => <Row key={x.id} label={`Banco · ${x.account_name || "Cuenta"}`} value={fmtCLP(Number(x.difference || 0))} badge="DIFERENCIA" />)}
            {!audit.openRecon.length && !audit.unmatchedBank.length && <Empty text="No hay excepciones críticas detectadas en los datos disponibles." />}
          </ListCard>
          <ListCard title="Próximas obligaciones" icon={<CalendarClock />}>
            {payments.filter(x => ["planned", "due", "overdue", "partial"].includes(x.status)).slice(0, 8).map(x => <Row key={x.id} label={`${x.tax_type || "Impuesto"} · ${x.due_date || "sin fecha"}`} value={fmtCLP(Math.max(0, Number(x.amount || 0) - Number(x.paid_amount || 0)))} badge={x.status} />)}
            {!payments.length && <Empty text="No hay obligaciones tributarias cargadas." />}
          </ListCard>
        </div>
      </>}

      {tab === "resultado" && <>
        <div className="grid gap-4 md:grid-cols-4">
          <Kpi title="Ingresos" value={fmtCLP(pnlMetrics.revenue)} icon={<ArrowUpRight />} good />
          <Kpi title="Costo de ventas" value={fmtCLP(pnlMetrics.costs)} icon={<ArrowDownRight />} good={false} />
          <Kpi title="Gastos operacionales" value={fmtCLP(pnlMetrics.expenses)} icon={<ArrowDownRight />} good={false} />
          <Kpi title="Resultado neto" value={fmtCLP(pnlMetrics.result)} icon={<Scale />} good={pnlMetrics.result >= 0} />
        </div>
        <ListCard title="Estado de resultados — últimos períodos" icon={<Scale />}>
          {pnl.slice(0, 12).map(x => <div key={`${x.business_id}-${x.period_start}`} className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm md:grid-cols-5"><span>{formatPeriod(x.period_start)}</span><span>Ingresos <strong>{fmtCLP(Number(x.revenue || 0))}</strong></span><span>Costos <strong>{fmtCLP(Number(x.cost_of_sales || 0))}</strong></span><span>Gastos <strong>{fmtCLP(Number(x.operating_expenses || 0))}</strong></span><span className={Number(x.net_result || 0) >= 0 ? "text-success" : "text-destructive"}>Resultado <strong>{fmtCLP(Number(x.net_result || 0))}</strong></span></div>)}
          {!pnl.length && <Empty text="El estado de resultados aparecerá al existir movimientos contables/operacionales." />}
        </ListCard>
      </>}

      {tab === "caja" && <>
        <div className="grid gap-4 md:grid-cols-4">
          <Kpi title="Entradas 90 días" value={fmtCLP(cashMetrics.inflow)} icon={<ArrowUpRight />} good />
          <Kpi title="Salidas 90 días" value={fmtCLP(cashMetrics.outflow)} icon={<ArrowDownRight />} good={false} />
          <Kpi title="Flujo neto" value={fmtCLP(cashMetrics.net)} icon={<Banknote />} good={cashMetrics.net >= 0} />
          <Kpi title="Saldo final conocido" value={fmtCLP(cashMetrics.ending)} icon={<Landmark />} good={cashMetrics.ending >= 0} />
        </div>
        <ListCard title="Flujo de caja diario" icon={<Landmark />}>
          {cash.slice(0, 30).map(x => <div key={`${x.business_id}-${x.flow_date}`} className="grid grid-cols-2 gap-2 rounded-lg border p-3 text-sm md:grid-cols-5"><span>{x.flow_date}</span><span className="text-success">Entradas {fmtCLP(Number(x.inflow || 0))}</span><span className="text-destructive">Salidas {fmtCLP(Number(x.outflow || 0))}</span><span>Flujo {fmtCLP(Number(x.net_flow || 0))}</span><strong>Saldo {fmtCLP(Number(x.ending_balance || 0))}</strong></div>)}
          {!cash.length && <Empty text="Registra y concilia caja/bancos para activar el flujo de caja." />}
        </ListCard>
      </>}

      {tab === "tributario" && <>
        <div className="grid gap-4 md:grid-cols-4">
          <Kpi title="F29 pendiente" value={fmtCLP(Number(latestF29?.total_to_pay || 0))} icon={<ReceiptText />} good={!latestF29 || Number(latestF29?.total_to_pay || 0) === 0} />
          <Kpi title="PPM F29" value={fmtCLP(Number(latestF29?.ppm_amount || 0))} icon={<CalculatorIcon />} good />
          <Kpi title="Renta" value={latestF22?.status || "No preparada"} icon={<FileCheck2 />} good={latestF22?.status === "filed"} />
          <Kpi title="Papeles de trabajo" value={String(papers.length)} icon={<BookOpenCheck />} good />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ListCard title="F29 y control mensual" icon={<ReceiptText />}>
            {f29.slice(0, 12).map(x => <Row key={x.id} label={`${x.period || x.tax_period_id || "Período"} · IVA`} value={fmtCLP(Number(x.total_to_pay || 0))} badge={x.status || "draft"} />)}
            {!f29.length && <Empty text="No hay declaraciones F29 preparadas. El sistema debe recibir y validar la información del período antes de presentar." />}
          </ListCard>
          <ListCard title="Renta / F22 y papeles de trabajo" icon={<FileCheck2 />}>
            {f22.slice(0, 6).map(x => <Row key={x.id} label={`AT ${x.tax_year} · resultado`} value={fmtCLP(Number(x.tax_result ?? x.taxable_base ?? 0))} badge={x.status || "draft"} />)}
            {papers.slice(0, 8).map(x => <Row key={x.id} label={`${x.tax_year} · ${x.section || "papel de trabajo"}`} value={fmtCLP(Number(x.taxable_amount || 0))} badge={x.status} />)}
            {!f22.length && !papers.length && <Empty text="Aquí se documentan la conciliación contable-tributaria y la preparación anual." />}
          </ListCard>
        </div>
      </>}

      {tab === "cierre" && <>
        <div className="grid gap-4 md:grid-cols-3">
          <Kpi title="Estado del cierre" value={latestClose?.close_state || "PENDIENTE"} icon={<ClipboardCheck />} good={latestClose?.close_state === "ready_to_close"} />
          <Kpi title="Controles aprobados" value={`${latestClose?.passed_items ?? 0}/${latestClose?.total_items ?? 0}`} icon={<CheckCircle2 />} good={Number(latestClose?.passed_items || 0) === Number(latestClose?.total_items || 0) && Number(latestClose?.total_items || 0) > 0} />
          <Kpi title="Asientos registrados" value={String(journals.length)} icon={<BookOpenCheck />} good />
        </div>
        <ListCard title="Checklist de cierre y conciliación" icon={<ClipboardCheck />}>
          {close.slice(0, 12).map(x => <div key={`${x.business_id}-${x.period_end}`} className="grid gap-2 rounded-lg border p-3 text-sm md:grid-cols-4"><span>{x.period_end}</span><span>{x.passed_items ?? 0}/{x.total_items ?? 0} controles</span><span>{x.exception_items ?? 0} excepciones</span><Badge variant="outline" className="w-fit">{x.close_state || "pending"}</Badge></div>)}
          {!close.length && <Empty text="El cierre se alimenta de conciliaciones, ajustes, impuestos y controles del período." />}
        </ListCard>
        <Card className="border-primary/20 bg-primary/5 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-semibold">Control con trazabilidad</h2><p className="mt-1 text-sm text-muted-foreground">Cada período debe poder reconstruirse desde evidencia y movimientos hasta conciliación, ajuste, estados financieros y obligaciones tributarias. La presentación oficial ante el SII continúa requiriendo autenticación y revisión del contribuyente o profesional responsable.</p></div></div></Card>
      </>}
    </div>
  </ModuleGuard>;
}

function tabLabel(tab: Tab) { return ({ resumen: "Resumen ejecutivo", resultado: "Estado de resultados", caja: "Flujo de caja", tributario: "F29 · F22 · Impuestos", cierre: "Cierre y auditoría" })[tab]; }
function formatPeriod(value: string) { try { return new Date(value).toLocaleDateString("es-CL", { month: "long", year: "numeric" }); } catch { return value; } }
function Kpi({ title, value, icon, good }: any) { return <Card className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-xs text-muted-foreground">{title}</div><div className="mt-1 text-xl font-bold tracking-tight">{value}</div></div><div className={`rounded-xl p-2 ${good ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{icon}</div></div></Card>; }
function HealthCard({ title, icon, status, tone, children }: any) { return <Card className="p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="text-primary">{icon}</span><h2 className="font-semibold">{title}</h2></div><Badge variant="outline" className={tone === "good" ? "text-success" : "text-warning"}>{status}</Badge></div><div className="mt-4 space-y-2">{children}</div></Card>; }
function ListCard({ title, icon, children }: any) { return <Card className="p-5"><div className="flex items-center gap-2"><span className="text-primary">{icon}</span><h2 className="font-semibold">{title}</h2></div><div className="mt-4 space-y-2">{children}</div></Card>; }
function Row({ label, value, badge }: any) { return <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span className="min-w-0 truncate">{label}</span><div className="flex shrink-0 items-center gap-2"><strong>{value}</strong>{badge && <Badge variant="outline">{badge}</Badge>}</div></div>; }
function Empty({ text }: { text: string }) { return <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{text}</p>; }
function CalculatorIcon() { return <span className="text-sm font-bold">PPM</span>; }
