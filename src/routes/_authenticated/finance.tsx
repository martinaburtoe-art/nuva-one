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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  FileDown,
  Landmark,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Wallet,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useBizList, useBizInsert, useBizDelete, fmtCLP } from "@/lib/biz-data";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/export";
import { generateMonthlyReportPdf } from "@/lib/monthly-report";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Caja — Nüva One" }] }),
  component: Finance,
});

const EXPENSE_CATEGORIES = ["Insumos", "Mercadería para reventa", "Equipamiento", "Arriendo", "Servicios", "Marketing", "Otro"];
const INCOME_CATEGORIES = ["Ventas", "Servicios prestados", "Otros ingresos"];
type Period = "7" | "30" | "90" | "365" | "all";

function dateDaysAgo(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function Finance() {
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);
  const { active } = useActiveBusiness();
  const { data: tx, isLoading } = useBizList<any>("transactions", { order: "tx_date" });
  const { data: sales } = useBizList<any>("sales");
  const { data: purchases } = useBizList<any>("purchases");
  const insert = useBizInsert("transactions");
  const del = useBizDelete("transactions");
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [otherCategory, setOtherCategory] = useState("");
  const [period, setPeriod] = useState<Period>("30");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const allTx = tx ?? [];
  const totals = useMemo(() => {
    const income = allTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = allTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    return { income, expense, net: income - expense };
  }, [allTx]);

  const periodTx = useMemo(() => {
    if (period === "all") return allTx;
    const start = dateDaysAgo(Number(period) - 1);
    return allTx.filter((t) => new Date(t.tx_date) >= start);
  }, [allTx, period]);

  const metrics = useMemo(() => {
    const income = periodTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = periodTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    const net = income - expense;
    const days = period === "all" ? Math.max(1, Math.ceil((Date.now() - new Date(periodTx.at(-1)?.tx_date ?? Date.now()).getTime()) / 86400000)) : Number(period);
    const burn = expense / Math.max(days, 1);
    const positiveBalance = Math.max(0, totals.net);
    const runway = burn > 0 && positiveBalance > 0 ? Math.floor(positiveBalance / burn) : null;
    const previousStart = dateDaysAgo((Number(period) || 30) * 2 - 1);
    const previousEnd = dateDaysAgo(Number(period) || 30);
    const previous = allTx.filter((t) => {
      const d = new Date(t.tx_date);
      return period !== "all" && d >= previousStart && d < previousEnd;
    });
    const previousNet = previous.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0) - previous.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    const netTrend = previous.length ? ((net - previousNet) / Math.max(Math.abs(previousNet), 1)) * 100 : null;
    return { income, expense, net, burn, runway, netTrend };
  }, [periodTx, period, totals.net, allTx]);

  const filteredTx = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...periodTx]
      .filter((t) => filter === "all" || t.type === filter)
      .filter((t) => !q || `${t.category ?? ""} ${t.description ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.tx_date).getTime() - new Date(a.tx_date).getTime());
  }, [periodTx, filter, search]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    periodTx.filter((t) => t.type === "expense").forEach((t) => map.set(t.category || "Otro", (map.get(t.category || "Otro") || 0) + Number(t.amount || 0)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [periodTx]);

  const receivables = useMemo(() => {
    const credits = (sales ?? []).filter((s: any) => s.is_credit && s.status !== "cancelled");
    const pending = credits.reduce((sum: number, s: any) => sum + Math.max(0, Number(s.total || 0) - Number(s.paid_amount || 0)), 0);
    const overdue = credits.filter((s: any) => Number(s.paid_amount || 0) < Number(s.total || 0) && s.due_date && new Date(s.due_date) < new Date()).reduce((sum: number, s: any) => sum + Math.max(0, Number(s.total || 0) - Number(s.paid_amount || 0)), 0);
    const billed = credits.reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);
    const collected = credits.reduce((sum: number, s: any) => sum + Number(s.paid_amount || 0), 0);
    return { pending, overdue, rate: billed > 0 ? (collected / billed) * 100 : 0 };
  }, [sales]);

  const signal = metrics.net < 0 ? "Presión de caja" : metrics.runway !== null && metrics.runway < 30 ? "Vigilar caja" : "Caja saludable";
  const signalClass = metrics.net < 0 ? "bg-destructive/10 text-destructive" : metrics.runway !== null && metrics.runway < 30 ? "bg-warning/10 text-warning" : "bg-success/10 text-success";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const finalCategory = category === "Otro" ? otherCategory.trim() || "Otro" : category;
    try {
      await insert.mutateAsync({ type: fd.get("type"), category: finalCategory, amount: Number(fd.get("amount")), description: fd.get("description") });
      setOpen(false);
      setType("expense");
      setCategory(EXPENSE_CATEGORIES[0]);
      setOtherCategory("");
      toast.success("Movimiento registrado");
    } catch {
      toast.error("No fue posible registrar el movimiento");
    }
  }

  function deleteTx(t: any) {
    const auto = new Set([...(sales ?? []).map((s: any) => s.transaction_id).filter(Boolean), ...(purchases ?? []).map((p: any) => p.transaction_id).filter(Boolean)]);
    if (auto.has(t.id)) {
      toast.error("Este movimiento proviene de Ventas o Compras y no puede eliminarse desde Caja.");
      return;
    }
    del.mutate(t.id);
  }

  async function exportPdf() {
    const now = new Date();
    const monthTx = allTx.filter((t) => { const d = new Date(t.tx_date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); });
    if (!monthTx.length) return toast.info("No hay movimientos este mes para reportar");
    try { await generateMonthlyReportPdf(active?.name ?? "Negocio", monthTx, now.toLocaleDateString("es-CL", { month: "long", year: "numeric" })); }
    catch { toast.error("Error al generar el PDF"); }
  }

  return (
    <ModuleGuard module="finance">
      <>
        <PageHeader
          title="Caja"
          description="Centro de control de liquidez, ingresos, gastos y cobranza"
          action={<div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!allTx.length} onClick={() => downloadCsv("movimientos.csv", allTx.map((t) => ({ fecha: t.tx_date, tipo: t.type, categoria: t.category ?? "", monto: t.amount, descripcion: t.description ?? "" })))}><Download className="mr-1.5 h-4 w-4" /> CSV</Button>
            <Button variant="outline" disabled={!allTx.length} onClick={exportPdf}><FileDown className="mr-1.5 h-4 w-4" /> PDF</Button>
            {canWrite && <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" /> Nuevo movimiento</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar movimiento de caja</DialogTitle></DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div><Label>Tipo</Label><select name="type" value={type} onChange={(e) => { const v = e.target.value as "income" | "expense"; setType(v); setCategory(v === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]); }} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="income">Ingreso</option><option value="expense">Gasto</option></select></div>
                  <div><Label>Categoría</Label><select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm">{(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => <option key={c}>{c}</option>)}</select>{category === "Otro" && <Input className="mt-2" placeholder="Especifica la categoría" value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)} />}</div>
                  <div><Label>Monto (CLP)</Label><Input name="amount" type="number" min="1" required placeholder="0" /></div>
                  <div><Label>Descripción</Label><Input name="description" placeholder="Ej. pago proveedor, venta, arriendo..." /></div>
                  <Button type="submit" className="w-full" disabled={insert.isPending}>{insert.isPending ? "Guardando..." : "Registrar movimiento"}</Button>
                </form>
              </DialogContent>
            </Dialog>}
          </div>}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Wallet className="h-5 w-5" />} label="Flujo neto" value={fmtCLP(metrics.net)} tone={metrics.net >= 0 ? "success" : "danger"} detail={metrics.netTrend !== null ? `${metrics.netTrend >= 0 ? "+" : ""}${metrics.netTrend.toFixed(0)}% vs período anterior` : "Sin período comparable"} />
          <Metric icon={<ArrowUpRight className="h-5 w-5" />} label="Ingresos" value={fmtCLP(metrics.income)} tone="success" detail={`${period === "all" ? "Todo el historial" : `Últimos ${period} días`}`} />
          <Metric icon={<ArrowDownRight className="h-5 w-5" />} label="Gastos" value={fmtCLP(metrics.expense)} tone="danger" detail={`Burn diario: ${fmtCLP(metrics.burn)}`} />
          <Metric icon={<Activity className="h-5 w-5" />} label="Cobranza" value={`${receivables.rate.toFixed(0)}%`} tone={receivables.rate >= 80 ? "success" : "warning"} detail={`${fmtCLP(receivables.pending)} por cobrar`} />
        </div>

        <Card className="mt-4 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5">
            <div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-2.5"><Landmark className="h-5 w-5 text-primary" /></div><div><h2 className="font-semibold">Nüva Cash Control</h2><p className="text-sm text-muted-foreground">Lectura ejecutiva para tomar decisiones antes de que falte liquidez.</p></div></div>
            <Badge className={signalClass}>{signal}</Badge>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
            <Insight icon={<ShieldAlert className="h-4 w-4" />} label="Cobertura estimada" value={metrics.runway !== null ? `${metrics.runway} días` : "No calculable"} text={metrics.runway !== null ? "Basada en flujo neto registrado y gasto diario." : "Registra ingresos y gastos para estimarla."} />
            <Insight icon={<CalendarDays className="h-4 w-4" />} label="Últimos 30 días" value={fmtCLP(period === "30" ? metrics.net : allTx.filter((t) => new Date(t.tx_date) >= dateDaysAgo(29)).reduce((s, t) => s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)), 0))} text="Flujo neto registrado en la ventana móvil." />
            <Insight icon={<AlertTriangle className="h-4 w-4" />} label="Vencido por cobrar" value={fmtCLP(receivables.overdue)} text={receivables.overdue > 0 ? "Prioriza estas cuentas para proteger caja." : "No hay vencidos registrados."} />
            <Insight icon={<Sparkles className="h-4 w-4" />} label="Señal Nüva" value={metrics.net < 0 ? "Reducir burn" : receivables.overdue > 0 ? "Acelerar cobranza" : "Mantener disciplina"} text="Recomendación heurística basada en datos registrados." />
          </div>
        </Card>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Movimientos</h2><p className="text-sm text-muted-foreground">Controla el detalle que alimenta tus indicadores.</p></div><div className="flex flex-wrap gap-2"><select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="rounded-md border bg-background px-3 py-2 text-sm"><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option><option value="365">365 días</option><option value="all">Todo</option></select><select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="rounded-md border bg-background px-3 py-2 text-sm"><option value="all">Todos</option><option value="income">Ingresos</option><option value="expense">Gastos</option></select></div></div>
            <div className="relative mt-4"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar categoría o descripción..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div className="mt-4 overflow-x-auto">
              {isLoading ? <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : !filteredTx.length ? <EmptyState title="Sin movimientos" description="No hay movimientos que coincidan con este filtro." /> : <table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="pb-3 font-medium">Fecha</th><th className="pb-3 font-medium">Categoría</th><th className="pb-3 font-medium">Descripción</th><th className="pb-3 text-right font-medium">Monto</th><th className="pb-3" /></tr></thead><tbody>{filteredTx.slice(0, 100).map((t) => <tr key={t.id} className="border-b last:border-0"><td className="py-3 whitespace-nowrap">{new Date(t.tx_date).toLocaleDateString("es-CL")}</td><td className="py-3"><Badge variant="outline">{t.category || "Otro"}</Badge></td><td className="max-w-[240px] truncate py-3 text-muted-foreground">{t.description || "—"}</td><td className={`py-3 text-right font-semibold ${t.type === "income" ? "text-success" : "text-destructive"}`}>{t.type === "income" ? "+" : "−"}{fmtCLP(Number(t.amount))}</td><td className="py-3 text-right"><Button size="icon" variant="ghost" onClick={() => deleteTx(t)} disabled={!canWrite || del.isPending} aria-label="Eliminar movimiento"><Trash2 className="h-4 w-4" /></Button></td></tr>)}</tbody></table>}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between"><div><h2 className="font-semibold">Dónde se está yendo el dinero</h2><p className="text-sm text-muted-foreground">Principales categorías del período.</p></div><TrendingDown className="h-5 w-5 text-muted-foreground" /></div>
            <div className="mt-5 space-y-4">{categoryBreakdown.length ? categoryBreakdown.slice(0, 6).map(([name, value]) => { const pct = metrics.expense ? (value / metrics.expense) * 100 : 0; return <div key={name}><div className="mb-1 flex justify-between text-sm"><span>{name}</span><span className="font-medium">{fmtCLP(value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} /></div><div className="mt-1 text-xs text-muted-foreground">{pct.toFixed(1)}% del gasto</div></div>; }) : <EmptyState title="Sin gastos" description="Todavía no hay gastos en el período seleccionado." />}</div>
          </Card>
        </div>

        <Card className="mt-4 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Radar de liquidez</h2><p className="text-sm text-muted-foreground">Acciones prioritarias para proteger la caja.</p></div><TrendingUp className="h-5 w-5 text-primary" /></div><div className="mt-4 grid gap-3 md:grid-cols-3"><ActionCard title="Cobranza" value={fmtCLP(receivables.overdue)} description={receivables.overdue > 0 ? "Monto vencido que conviene gestionar primero." : "No hay cartera vencida registrada."} urgent={receivables.overdue > 0} /><ActionCard title="Gasto diario" value={fmtCLP(metrics.burn)} description="Promedio del período seleccionado para estimar presión de caja." urgent={metrics.burn > 0 && metrics.runway !== null && metrics.runway < 30} /><ActionCard title="Resultado" value={fmtCLP(metrics.net)} description={metrics.net >= 0 ? "El flujo del período está en terreno positivo." : "El período presenta salida neta: revisa gastos y cobranza."} urgent={metrics.net < 0} /></div></Card>
      </>
    </ModuleGuard>
  );
}

function Metric({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: "success" | "danger" | "warning" }) {
  const cls = tone === "success" ? "bg-success/10 text-success" : tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning";
  return <Card className="p-5"><div className="flex items-start justify-between"><div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div><div className={`rounded-xl p-2 ${cls}`}>{icon}</div></div><div className="mt-3 text-xs text-muted-foreground">{detail}</div></Card>;
}

function Insight({ icon, label, value, text }: { icon: React.ReactNode; label: string; value: string; text: string }) {
  return <div className="rounded-xl border bg-muted/20 p-4"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">{icon}{label}</div><div className="mt-2 text-lg font-bold">{value}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>;
}

function ActionCard({ title, value, description, urgent }: { title: string; value: string; description: string; urgent: boolean }) {
  return <div className={`rounded-xl border p-4 ${urgent ? "border-destructive/30 bg-destructive/5" : "bg-muted/20"}`}><div className="flex items-center justify-between"><span className="text-sm font-medium">{title}</span>{urgent && <AlertTriangle className="h-4 w-4 text-destructive" />}</div><div className="mt-2 text-xl font-bold">{value}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>;
}
