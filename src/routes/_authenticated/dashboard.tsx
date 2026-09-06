import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtCLP } from "@/lib/biz-data";
import { DateRangeFilter, dmyToIso } from "@/components/date-range-filter";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { ModuleGuard } from "@/components/module-guard";
import { NuvaScoreCard } from "@/components/nuva-score-card";
import { BusinessInsightCard } from "@/components/business-insight-card";
import { NuvaActionCenter } from "@/components/nuva-action-center";
import { ArrowUpRight, X, CheckCircle2, Sparkles, ShieldAlert } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Resumen — Nüva One" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { active } = useActiveBusiness();
  const [onboardingFocus, setOnboardingFocus] = useState("Todo");

  useEffect(() => {
    try { setOnboardingFocus(localStorage.getItem("nuva.onboarding_goal") || "Todo"); }
    catch { setOnboardingFocus("Todo"); }
  }, []);

  const { data: kpis } = useQuery({
    enabled: !!active?.id,
    queryKey: ["kpis", active?.id],
    queryFn: async () => {
      const bid = active!.id;
      const [sales, expenses, products, salesCount] = await Promise.all([
        supabase.from("transactions").select("amount").eq("business_id", bid).eq("type", "income"),
        supabase.from("transactions").select("amount").eq("business_id", bid).eq("type", "expense"),
        supabase.from("products").select("stock, price, low_stock_threshold, reorder_point").eq("business_id", bid),
        supabase.from("sales").select("id", { count: "exact", head: true }).eq("business_id", bid).neq("status", "cancelled"),
      ]);
      const income = (sales.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
      const expense = (expenses.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
      const inventoryValue = (products.data ?? []).reduce((s, r: any) => s + Number(r.stock) * Number(r.price), 0);
      const lowStockCount = (products.data ?? []).filter((r: any) => {
        const stock = Number(r.stock ?? 0);
        const threshold = Number(r.low_stock_threshold ?? r.reorder_point ?? 0);
        return threshold > 0 && stock <= threshold;
      }).length;
      return { income, expense, net: income - expense, inventoryValue, salesCount: salesCount.count ?? 0, productsCount: (products.data ?? []).length, lowStockCount };
    },
  });

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const isoFrom = dmyToIso(dateFrom);
  const isoTo = dmyToIso(dateTo);

  const { data: allTx } = useQuery({
    enabled: !!active?.id,
    queryKey: ["chart-tx", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("amount, type, tx_date, category").eq("business_id", active!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    (allTx ?? []).forEach((t: any) => t.category && set.add(t.category));
    return Array.from(set).sort().map((c) => ({ value: c, label: c }));
  }, [allTx]);

  const hasChartFilters = !!dateFrom || !!dateTo || categories.length > 0;
  const chartData = useMemo(() => {
    const rows = (allTx ?? []).filter((r: any) => {
      if (isoFrom && r.tx_date < isoFrom) return false;
      if (isoTo && r.tx_date > isoTo) return false;
      if (categories.length > 0 && !categories.includes(r.category)) return false;
      return true;
    });
    if (isoFrom || isoTo) {
      const byDay: Record<string, { fecha: string; ingresos: number; gastos: number }> = {};
      rows.forEach((r: any) => {
        const key = r.tx_date;
        if (!byDay[key]) byDay[key] = { fecha: new Date(key + "T00:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" }), ingresos: 0, gastos: 0 };
        if (r.type === "income") byDay[key].ingresos += Number(r.amount); else byDay[key].gastos += Number(r.amount);
      });
      return Object.keys(byDay).sort().map((k) => byDay[k]);
    }
    const byMonth: Record<string, { mes: string; ingresos: number; gastos: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      byMonth[`${d.getFullYear()}-${d.getMonth()}`] = { mes: d.toLocaleDateString("es-CL", { month: "short" }), ingresos: 0, gastos: 0 };
    }
    rows.forEach((r: any) => {
      const d = new Date(r.tx_date); const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (byMonth[key]) { if (r.type === "income") byMonth[key].ingresos += Number(r.amount); else byMonth[key].gastos += Number(r.amount); }
    });
    return Object.values(byMonth);
  }, [allTx, isoFrom, isoTo, categories]);

  const focusAction = onboardingFocus === "sales" ? { label: "Registra tu primera venta", href: "/pos" } : onboardingFocus === "inventory" ? { label: "Carga tus primeros productos", href: "/inventory" } : onboardingFocus === "finance" ? { label: "Registra tu primer movimiento", href: "/finance" } : onboardingFocus === "customers" ? { label: "Crea tu primer cliente", href: "/crm" } : { label: "Completa tu primera operación", href: "/sales" };
  const hasActivity = (kpis?.productsCount ?? 0) > 0 || (kpis?.salesCount ?? 0) > 0;
  const attentionCount = (kpis?.lowStockCount ?? 0) + ((kpis?.net ?? 0) < 0 ? 1 : 0);

  return (
    <ModuleGuard module="dashboard">
      <>
        <PageHeader title={`Hola, ${active?.name ?? "negocio"}`} description="Tu panel operativo: qué está pasando y qué necesita atención hoy." />
        <NuvaActionCenter />
        {kpis !== undefined && !hasActivity && (
          <Card className="mb-6 overflow-hidden border-primary/30 bg-gradient-to-br from-primary/[0.08] via-accent/40 to-background p-6 shadow-soft">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Sparkles className="h-4 w-4" /> Activación de Nüva One</div><h2 className="mt-2 text-xl font-bold">Tu Nüva One está listo. Ahora hagamos que empiece a trabajar para ti.</h2><p className="mt-1 text-sm text-muted-foreground">Tu foco inicial es <strong className="text-foreground">{goalsLabel(onboardingFocus)}</strong>. Completa una primera operación y comenzaremos a construir tu visión del negocio.</p></div><Link to={focusAction.href} className="shrink-0"><Button size="lg">{focusAction.label}<ArrowUpRight className="ml-1 h-4 w-4" /></Button></Link></div>
            <div className="mt-6 grid gap-2 sm:grid-cols-4"><ActivationStep done title="Negocio creado" /><ActivationStep done={hasActivity} title="Primera operación" /><ActivationStep done={(kpis?.productsCount ?? 0) > 0 && (kpis?.salesCount ?? 0) > 0} title="Datos conectados" /><ActivationStep done={false} title="Primer análisis" /></div>
          </Card>
        )}
        <BusinessInsightCard income={kpis?.income ?? 0} expense={kpis?.expense ?? 0} inventoryValue={kpis?.inventoryValue ?? 0} productsCount={kpis?.productsCount ?? 0} salesCount={kpis?.salesCount ?? 0} />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <OperationalCard icon={<ShieldAlert className="h-5 w-5" />} label="Atención hoy" value={attentionCount} description={attentionCount === 0 ? "Sin alertas operativas detectadas" : "Puntos que conviene revisar"} href={attentionCount > 0 ? "/inventory" : "/sales"} />
          <OperationalCard icon={<Sparkles className="h-5 w-5" />} label="Dirección" value="Centro Ejecutivo" description="Decisiones, predicción y ejecución" href="/executive-command-center" />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6"><NuvaScoreCard /><Card className="p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">Resumen financiero</h3><p className="text-xs text-muted-foreground">Acumulado registrado</p></div><Link to="/finance" className="text-xs font-medium text-primary hover:underline">Ver finanzas</Link></div><div className="mt-5 grid grid-cols-2 gap-3"><Metric label="Ingresos" value={fmtCLP(kpis?.income ?? 0)} /><Metric label="Gastos" value={fmtCLP(kpis?.expense ?? 0)} /><Metric label="Neto" value={fmtCLP(kpis?.net ?? 0)} /><Metric label="Inventario" value={fmtCLP(kpis?.inventoryValue ?? 0)} /></div></Card></div>
          <Card className="p-6 lg:col-span-2"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Ingresos vs Gastos</h3><p className="text-xs text-muted-foreground">{isoFrom || isoTo ? "Rango seleccionado" : "Últimos 6 meses"}</p></div><div className="flex flex-wrap items-end gap-2"><DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} /><MultiSelectFilter label="Categoría" options={categoryOptions} selected={categories} onChange={setCategories} />{hasChartFilters && <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setCategories([]); }}><X className="mr-1 h-3.5 w-3.5" /> Quitar filtros</Button>}</div></div><ResponsiveContainer width="100%" height={280}><AreaChart data={chartData ?? []}><defs><linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="oklch(0.65 0.22 268)" stopOpacity={0.4} /><stop offset="100%" stopColor="oklch(0.65 0.22 268)" stopOpacity={0} /></linearGradient><linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="oklch(0.6 0.22 25)" stopOpacity={0.3} /><stop offset="100%" stopColor="oklch(0.6 0.22 25)" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 270)" /><XAxis dataKey={isoFrom || isoTo ? "fecha" : "mes"} stroke="oklch(0.5 0.02 270)" fontSize={12} /><YAxis stroke="oklch(0.5 0.02 270)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 270)" }} /><Area type="monotone" dataKey="ingresos" stroke="oklch(0.55 0.22 268)" fill="url(#gi)" strokeWidth={2} /><Area type="monotone" dataKey="gastos" stroke="oklch(0.6 0.22 25)" fill="url(#ge)" strokeWidth={2} /></AreaChart></ResponsiveContainer></Card>
          <Card className="p-6"><h3 className="font-semibold">Acciones rápidas</h3><p className="text-xs text-muted-foreground">Operaciones frecuentes</p><div className="mt-4 space-y-2">{[{ l: "Registrar venta", h: "/sales" }, { l: "Agregar producto", h: "/inventory" }, { l: "Nueva cotización", h: "/quotes" }, { l: "Registrar gasto", h: "/finance" }].map((a) => <Link key={a.h} to={a.h} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"><span>{a.l}</span><ArrowUpRight className="h-4 w-4" /></Link>)}</div></Card>
        </div>
      </>
    </ModuleGuard>
  );
}

function OperationalCard({ icon, label, value, description, href }: { icon: React.ReactNode; label: string; value: string | number; description: string; href: string }) {
  return <Link to={href} className="block"><Card className="h-full p-5 transition-colors hover:bg-muted/30"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div></div><p className="mt-3 text-xs text-muted-foreground">{description}</p></Card></Link>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold tabular-nums">{value}</p></div>; }
function ActivationStep({ done, title }: { done: boolean; title: string }) { return <div className="flex items-center gap-2 rounded-xl border bg-background/70 px-3 py-2 text-xs"><CheckCircle2 className={`h-4 w-4 ${done ? "text-primary" : "text-muted-foreground/40"}`} /><span className={done ? "font-medium" : "text-muted-foreground"}>{title}</span></div>; }
function goalsLabel(value: string) { return value === "sales" ? "ventas" : value === "inventory" ? "inventario" : value === "finance" ? "finanzas" : value === "customers" ? "clientes" : "todo el negocio"; }
