import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { useActiveBusiness } from "@/lib/use-business";
import { useBizList, fmtCLP } from "@/lib/biz-data";
import { CheckCircle2, AlertTriangle, Landmark, Scale, FileCheck2, ReceiptText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/financial-control")({
  head: () => ({ meta: [{ title: "Control Financiero Profesional — Nüva One" }] }),
  component: FinancialControl,
});

function FinancialControl() {
  const { active } = useActiveBusiness();
  const { data: pnl = [] } = useBizList<any>("v_financial_management_pnl_monthly", { order: "period_start", ascending: false });
  const { data: cash = [] } = useBizList<any>("v_cash_flow_daily", { order: "flow_date", ascending: false });
  const { data: close = [] } = useBizList<any>("v_financial_close_status", { order: "period_end", ascending: false });
  const { data: recon = [] } = useBizList<any>("financial_reconciliation_items", { order: "period_end", ascending: false });
  const { data: bank = [] } = useBizList<any>("bank_reconciliation_sessions", { order: "period_end", ascending: false });
  const { data: papers = [] } = useBizList<any>("tax_working_papers", { order: "tax_year", ascending: false });
  const { data: payments = [] } = useBizList<any>("tax_payments", { order: "due_date" });

  const latest = pnl[0];
  const cashNet = useMemo(() => cash.slice(0, 30).reduce((s: number, x: any) => s + Number(x.net_flow || 0), 0), [cash]);
  const exceptions = recon.filter((x: any) => ["open", "partial", "exception"].includes(x.status)).length;
  const dueTaxes = payments.filter((x: any) => ["planned", "due", "overdue", "partial"].includes(x.status)).reduce((s: number, x: any) => s + Math.max(0, Number(x.amount || 0) - Number(x.paid_amount || 0)), 0);
  const latestClose = close[0];

  return <ModuleGuard module="finance">
    <PageHeader title="Control Financiero Profesional" description={`Cierre, conciliación, flujo, papeles de trabajo y obligaciones tributarias${active ? ` · ${active.name}` : ""}`} />
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi title="Resultado último período" value={fmtCLP(Number(latest?.net_result || 0))} icon={<Scale />} good={Number(latest?.net_result || 0) >= 0} />
        <Kpi title="Flujo neto reciente" value={fmtCLP(cashNet)} icon={<Landmark />} good={cashNet >= 0} />
        <Kpi title="Excepciones de conciliación" value={String(exceptions)} icon={<AlertTriangle />} good={exceptions === 0} />
        <Kpi title="Impuestos pendientes" value={fmtCLP(dueTaxes)} icon={<ReceiptText />} good={dueTaxes === 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><SectionTitle icon={<Scale />} title="Estado de resultados mensual" /><div className="mt-4 space-y-2">{pnl.slice(0, 12).map((x: any) => <Row key={`${x.business_id}-${x.period_start}`} label={new Date(x.period_start).toLocaleDateString("es-CL", { month: "long", year: "numeric" })} value={fmtCLP(Number(x.net_result || 0))} />)}{!pnl.length && <Empty text="Aún no hay actividad para calcular resultados." />}</div></Card>
        <Card className="p-5"><SectionTitle icon={<Landmark />} title="Conciliación bancaria" /><div className="mt-4 space-y-2">{bank.slice(0, 8).map((x: any) => <Row key={x.id} label={`${x.account_name} · ${x.period_end}`} value={fmtCLP(Number(x.difference || 0))} badge={x.status} />)}{!bank.length && <Empty text="Crea la primera sesión de conciliación con la cartola bancaria." />}</div></Card>
        <Card className="p-5"><SectionTitle icon={<FileCheck2 />} title="Cierre contable" /><div className="mt-4 space-y-2">{close.slice(0, 8).map((x: any) => <Row key={`${x.business_id}-${x.period_end}`} label={x.period_end} value={`${x.passed_items}/${x.total_items} controles`} badge={x.close_state} />)}{!close.length && <Empty text="El cierre profesional se construye con checklist, ajustes y conciliaciones." />}</div></Card>
        <Card className="p-5"><SectionTitle icon={<ReceiptText />} title="Papeles de trabajo tributarios" /><div className="mt-4 space-y-2">{papers.slice(0, 10).map((x: any) => <Row key={x.id} label={`${x.tax_year} · ${x.section} · ${x.concept}`} value={fmtCLP(Number(x.taxable_amount || 0))} badge={x.status} />)}{!papers.length && <Empty text="Aquí se documentan conciliaciones contable-tributarias para F29/F22." />}</div></Card>
      </div>
      <Card className="border-primary/20 bg-primary/5 p-5"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-semibold">Motor profesional activado</h2><p className="mt-1 text-sm text-muted-foreground">Nüva separa datos operacionales, evidencia, conciliación, ajustes, cierre y papeles tributarios. La información oficial del SII sigue siendo la fuente normativa y la presentación final requiere revisión según régimen y situación del contribuyente.</p></div></div></Card>
    </div>
  </ModuleGuard>;
}

function Kpi({ title, value, icon, good }: any) { return <Card className="p-4"><div className="flex justify-between"><div><div className="text-xs text-muted-foreground">{title}</div><div className="mt-1 text-xl font-bold">{value}</div></div><div className={`rounded-xl p-2 ${good ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{icon}</div></div></Card>; }
function SectionTitle({ icon, title }: any) { return <div className="flex items-center gap-2"><span className="text-primary">{icon}</span><h2 className="font-semibold">{title}</h2></div>; }
function Row({ label, value, badge }: any) { return <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span className="truncate">{label}</span><div className="flex items-center gap-2"><strong>{value}</strong>{badge && <Badge variant="outline">{badge}</Badge>}</div></div>; }
function Empty({ text }: { text: string }) { return <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{text}</p>; }
