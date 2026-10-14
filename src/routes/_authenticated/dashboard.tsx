import "@/resumen-premium.css";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, dmyToIso } from "@/components/date-range-filter";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { ModuleGuard } from "@/components/module-guard";
import { NuvaScoreCard } from "@/components/nuva-score-card";
import { fmtCLP } from "@/lib/biz-data";
import { ArrowUpRight, X, CheckCircle2, Sparkles, ShieldAlert, TrendingUp, Package, ShoppingBag, Plus, ArrowDownRight } from "lucide-react";
const DashboardChart = lazy(() => import("@/components/dashboard-chart").then((m) => ({ default: m.DashboardChart })));

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Resumen — Nüva One" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { active } = useActiveBusiness();
  const [onboardingFocus, setOnboardingFocus] = useState("Todo");
  const [seedingDemo, setSeedingDemo] = useState(false);

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

  const chartWindowStart = useMemo(() => {
    if (isoFrom) return isoFrom;
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  }, [isoFrom]);

  const { data: allTx } = useQuery({
    enabled: !!active?.id,
    queryKey: ["chart-tx", active?.id, chartWindowStart, isoTo, categories],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("amount, type, tx_date, category")
        .eq("business_id", active!.id)
        .gte("tx_date", chartWindowStart);

      if (isoTo) query = query.lte("tx_date", isoTo);
      if (categories.length > 0) query = query.in("category", categories);

      const { data, error } = await query;
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
  async function loadDemoBusiness() {
    setSeedingDemo(true);
    try {
      const { data, error } = await supabase.rpc("create_demo_business_for_current_user");
      if (error) throw error;
      localStorage.setItem("novaflow.active_business_id", data);
      window.location.assign("/dashboard");
    } catch (error: any) {
      console.error(error);
    } finally {
      setSeedingDemo(false);
    }
  }
  const attentionCount = (kpis?.lowStockCount ?? 0) + ((kpis?.net ?? 0) < 0 ? 1 : 0);

  return (
    <ModuleGuard module="dashboard">
      <main className="nuva-resumen-premium nuva-resumen-canvas">
        <header className="nuva-resumen-header">
          <div className="nuva-resumen-brandline">
            <span className="nuva-resumen-wordmark">nüva<span>one</span></span>
            <span className="nuva-resumen-breadcrumb">/ RESUMEN</span>
            <span className="nuva-resumen-live"><i /> VISTA EJECUTIVA</span>
          </div>
          <div className="nuva-resumen-heading">
            <div>
              <p className="nuva-resumen-overline">TU NEGOCIO, EN PERSPECTIVA</p>
              <h1>Hola, {active?.name ?? "tu negocio"}.</h1>
              <p className="nuva-resumen-subtitle">Una lectura clara de lo que está pasando hoy.</p>
            </div>
            <Button variant="outline" size="sm" className="nuva-resumen-demo-button" onClick={loadDemoBusiness} disabled={seedingDemo}>
              {seedingDemo ? "Preparando…" : "Cargar negocio de prueba"}
            </Button>
          </div>
        </header>

        {kpis !== undefined && !hasActivity && (
          <Card className="nuva-resumen-onboarding">
            <div className="nuva-resumen-onboarding-copy">
              <span className="nuva-resumen-section-label"><Sparkles className="h-4 w-4" /> CONFIGURACIÓN INICIAL</span>
              <h2>Tu espacio está listo para empezar.</h2>
              <p>Tu foco inicial son {goalsLabel(onboardingFocus)}. Registra una operación para activar los indicadores de tu negocio.</p>
              <Link to={focusAction.href}><Button size="sm">{focusAction.label}<ArrowUpRight className="ml-1 h-4 w-4" /></Button></Link>
            </div>
            <div className="nuva-resumen-steps"><ActivationStep done title="Negocio creado" /><ActivationStep done={hasActivity} title="Primera operación" /><ActivationStep done={(kpis?.productsCount ?? 0) > 0 && (kpis?.salesCount ?? 0) > 0} title="Datos conectados" /><ActivationStep done={false} title="Primer análisis" /></div>
          </Card>
        )}

        <section className="nuva-resumen-overview" aria-label="Indicadores principales">
          <article className="nuva-resumen-net-card">
            <div className="nuva-resumen-net-top">
              <span className="nuva-resumen-section-label">RESULTADO NETO</span>
              <span className="nuva-resumen-period"><span /> ACUMULADO</span>
            </div>
            <div className="nuva-resumen-net-value">{kpis ? fmtCLP(kpis.net) : "—"}</div>
            <div className="nuva-resumen-net-footer">
              <span className={kpis && kpis.net < 0 ? "nuva-resumen-negative" : "nuva-resumen-positive"}><TrendingUp className="h-4 w-4" /> {kpis && kpis.net < 0 ? "Requiere revisión" : "Ingresos menos gastos"}</span>
              <span className="nuva-resumen-net-note">Según movimientos registrados</span>
            </div>
            <svg className="nuva-resumen-net-art" viewBox="0 0 320 100" fill="none" aria-hidden="true"><path d="M0 78 C24 74 30 40 57 53 S95 79 119 45 S158 19 178 42 S216 70 239 35 S282 22 320 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M0 78 C24 74 30 40 57 53 S95 79 119 45 S158 19 178 42 S216 70 239 35 S282 22 320 7 V100 H0Z" fill="url(#nuvaNetFill)" opacity=".18"/><defs><linearGradient id="nuvaNetFill" x1="160" y1="0" x2="160" y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="#E6C687"/><stop offset="1" stopColor="#E6C687" stopOpacity="0"/></linearGradient></defs></svg>
          </article>
          <article className="nuva-resumen-metric-card">
            <div className="nuva-resumen-metric-head"><span>Ingresos</span><span className="nuva-resumen-metric-icon"><TrendingUp className="h-4 w-4" /></span></div>
            <strong>{kpis ? fmtCLP(kpis.income) : "—"}</strong>
            <p><span className="nuva-resumen-dot nuva-resumen-dot-gold" /> Total registrado</p>
          </article>
          <article className="nuva-resumen-metric-card">
            <div className="nuva-resumen-metric-head"><span>Gastos</span><span className="nuva-resumen-metric-icon"><ArrowDownRight className="h-4 w-4" /></span></div>
            <strong>{kpis ? fmtCLP(kpis.expense) : "—"}</strong>
            <p><span className="nuva-resumen-dot nuva-resumen-dot-grey" /> Total registrado</p>
          </article>
          <article className="nuva-resumen-metric-card">
            <div className="nuva-resumen-metric-head"><span>Inventario</span><span className="nuva-resumen-metric-icon"><Package className="h-4 w-4" /></span></div>
            <strong>{kpis ? fmtCLP(kpis.inventoryValue) : "—"}</strong>
            <p>{kpis ? `${kpis.productsCount} productos en catálogo` : "Consultando catálogo"}</p>
          </article>
        </section>

        <section className="nuva-resumen-lower-grid">
          <div className="nuva-resumen-panel nuva-resumen-chart-panel">
            <div className="nuva-resumen-panel-heading">
              <div><p className="nuva-resumen-section-label">EVOLUCIÓN FINANCIERA</p><h2>Ingresos y gastos</h2><p className="nuva-resumen-panel-caption">{isoFrom || isoTo ? "Período seleccionado" : "Últimos seis meses"}</p></div>
              <div className="nuva-resumen-filters"><DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} /><MultiSelectFilter label="Categoría" options={categoryOptions} selected={categories} onChange={setCategories} />{hasChartFilters && <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setCategories([]); }}><X className="mr-1 h-3.5 w-3.5" /> Limpiar</Button>}</div>
            </div>
            <Suspense fallback={<div className="nuva-resumen-chart-loading" />}><DashboardChart data={chartData ?? []} filtered={Boolean(isoFrom || isoTo)} /></Suspense>
            <div className="nuva-resumen-chart-legend"><span><i className="nuva-resumen-dot-gold" /> Ingresos</span><span><i className="nuva-resumen-dot-indigo" /> Gastos</span></div>
          </div>
          <aside className="nuva-resumen-side-column">
            <div className="nuva-resumen-panel nuva-resumen-health-panel">
              <p className="nuva-resumen-section-label">ESTADO DEL NEGOCIO</p><h2>Tu operación</h2>
              <div className="nuva-resumen-health-row"><span className="nuva-resumen-health-icon"><ShieldAlert className="h-4 w-4" /></span><div><strong>{attentionCount === 0 ? "Sin alertas críticas" : `${attentionCount} puntos por revisar`}</strong><p>{attentionCount === 0 ? "No se detectan alertas de inventario ni resultado negativo." : "Revisa inventario y resultado financiero."}</p></div></div>
              <div className="nuva-resumen-health-row"><span className="nuva-resumen-health-icon"><ShoppingBag className="h-4 w-4" /></span><div><strong>{kpis?.salesCount ?? "—"} ventas registradas</strong><p>{kpis ? `${kpis.productsCount} productos en catálogo` : "Consultando actividad"}</p></div></div>
              <Link to={attentionCount > 0 ? "/inventory" : "/executive-command-center"} className="nuva-resumen-text-link">{attentionCount > 0 ? "Revisar alertas" : "Abrir centro ejecutivo"} <ArrowUpRight className="h-4 w-4" /></Link>
            </div>
            <div className="nuva-resumen-panel nuva-resumen-actions-panel">
              <p className="nuva-resumen-section-label">SIGUIENTE PASO</p><h2>Acciones rápidas</h2>
              <div className="nuva-resumen-quick-actions">{[{ l: "Registrar venta", h: "/sales" }, { l: "Agregar producto", h: "/inventory" }, { l: "Nueva cotización", h: "/quotes" }, { l: "Registrar gasto", h: "/finance" }].map((a) => <Link key={a.h} to={a.h}><span><Plus className="h-3.5 w-3.5" /></span>{a.l}<ArrowUpRight className="nuva-resumen-action-arrow h-4 w-4" /></Link>)}</div>
            </div>
          </aside>
        </section>

        <section className="nuva-resumen-score-section"><div><p className="nuva-resumen-section-label">INTELIGENCIA DE NEGOCIO</p><h2>Salud de tu empresa</h2><p>Indicadores complementarios para tomar mejores decisiones.</p></div><div className="nuva-resumen-score-card"><NuvaScoreCard /></div></section>
        <footer className="nuva-resumen-footer"><span>NÜVA ONE <span>·</span> CONTROL DE NEGOCIO</span><span>Los indicadores reflejan los movimientos registrados en tu cuenta.</span></footer>
      </main>
    </ModuleGuard>
  );
}

function OperationalCard({ icon, label, value, description, href }: { icon: React.ReactNode; label: string; value: string | number; description: string; href: string }) {
  return <Link to={href} className="block"><Card className="h-full p-5 transition-colors hover:bg-muted/30"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div></div><p className="mt-3 text-xs text-muted-foreground">{description}</p></Card></Link>;
}

function ActivationStep({ done, title }: { done: boolean; title: string }) { return <div className="flex items-center gap-2 rounded-xl border bg-background/70 px-3 py-2 text-xs"><CheckCircle2 className={`h-4 w-4 ${done ? "text-primary" : "text-muted-foreground/40"}`} /><span className={done ? "font-medium" : "text-muted-foreground"}>{title}</span></div>; }
function goalsLabel(value: string) { return value === "sales" ? "ventas" : value === "inventory" ? "inventario" : value === "finance" ? "finanzas" : value === "customers" ? "clientes" : "todo el negocio"; }
