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
        <div className="nuva-resumen-ambient-word" aria-hidden="true">Resumen</div>
        <header className="nuva-resumen-header">
          <div className="nuva-resumen-brandline">
            <span className="nuva-resumen-wordmark">nüva<span>one</span></span>
            <span className="nuva-resumen-breadcrumb">/ TU NEGOCIO</span>
            <span className="nuva-resumen-live"><i /> PANEL EJECUTIVO</span>
          </div>
          <div className="nuva-resumen-heading">
            <div>
              <p className="nuva-resumen-overline">UNA VISIÓN MÁS CLARA</p>
              <h1>Todo en equilibrio.</h1>
              <p className="nuva-resumen-subtitle">El estado de tu negocio, con la claridad que necesitas para avanzar.</p>
            </div>
            <Button variant="outline" size="sm" className="nuva-resumen-demo-button" onClick={loadDemoBusiness} disabled={seedingDemo}>
              {seedingDemo ? "Preparando…" : "Explorar demo"}
            </Button>
          </div>
        </header>

        {kpis !== undefined && !hasActivity && (
          <Card className="nuva-resumen-onboarding">
            <div className="nuva-resumen-onboarding-copy">
              <span className="nuva-resumen-section-label"><Sparkles className="h-4 w-4" /> PRIMEROS PASOS</span>
              <h2>Tu espacio está listo.</h2>
              <p>Comienza con {goalsLabel(onboardingFocus).toLowerCase()} y convierte tus operaciones en una visión clara del negocio.</p>
              <Link to={focusAction.href}><Button size="sm">{focusAction.label}<ArrowUpRight className="ml-1 h-4 w-4" /></Button></Link>
            </div>
            <div className="nuva-resumen-steps"><ActivationStep done title="Negocio creado" /><ActivationStep done={hasActivity} title="Primera operación" /><ActivationStep done={(kpis?.productsCount ?? 0) > 0 && (kpis?.salesCount ?? 0) > 0} title="Datos conectados" /><ActivationStep done={false} title="Primer análisis" /></div>
          </Card>
        )}

        <section className="nuva-resumen-device-stage" aria-label="Panel ejecutivo de negocio">
          <article className="nuva-resumen-device nuva-resumen-device-performance">
            <div className="nuva-resumen-device-status"><span>9:41</span><span className="nuva-resumen-device-island" /><span>•••</span></div>
            <div className="nuva-resumen-device-topline"><span className="nuva-resumen-avatar">nü</span><span className="nuva-resumen-device-kicker">NÜVA ONE · FINANZAS</span><span className="nuva-resumen-notification">⌁</span></div>
            <div className="nuva-resumen-device-title"><span>Rendimiento</span><small>VISIÓN FINANCIERA</small></div><div className="nuva-resumen-filters nuva-resumen-device-filters"><DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} /><MultiSelectFilter label="Categoría" options={categoryOptions} selected={categories} onChange={setCategories} /></div>
            <div className="nuva-resumen-device-chart"><Suspense fallback={<div className="nuva-resumen-chart-loading" />}><DashboardChart data={chartData ?? []} filtered={Boolean(isoFrom || isoTo)} /></Suspense></div>
            <div className="nuva-resumen-device-legend"><span><i className="nuva-resumen-dot-gold" /> Ingresos</span><span><i className="nuva-resumen-dot-indigo" /> Gastos</span></div>
            <div className="nuva-resumen-device-divider" />
            <div className="nuva-resumen-device-minirow"><span>Ventas registradas</span><strong>{kpis?.salesCount ?? "—"}</strong></div>
            <div className="nuva-resumen-device-minirow"><span>Productos en catálogo</span><strong>{kpis?.productsCount ?? "—"}</strong></div>
            <div className="nuva-resumen-device-bottom"><span>Resumen</span><span>Finanzas</span><span>Actividad</span></div>
          </article>

          <article className="nuva-resumen-device nuva-resumen-device-main">
            <div className="nuva-resumen-device-status"><span>9:41</span><span className="nuva-resumen-device-island" /><span>•••</span></div>
            <div className="nuva-resumen-device-topline"><span className="nuva-resumen-avatar">nü</span><span className="nuva-resumen-device-kicker">TU NEGOCIO, EN EQUILIBRIO</span><span className="nuva-resumen-notification">⌁</span></div>
            <div className="nuva-resumen-main-intro"><p>PANEL EJECUTIVO</p><h2>Todo en equilibrio.</h2><span>Una mirada clara a tu negocio.</span></div>
            <div className="nuva-resumen-balance-card">
              <div className="nuva-resumen-balance-label"><span>RESULTADO DEL NEGOCIO</span><span className="nuva-resumen-balance-mark">↗</span></div>
              <strong>{kpis ? fmtCLP(kpis.net) : "—"}</strong>
              <p className={kpis && kpis.net < 0 ? "nuva-resumen-negative" : "nuva-resumen-positive"}>{kpis && kpis.net < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}{kpis && kpis.net < 0 ? "Requiere atención" : "Resultado acumulado"}</p>
              <svg className="nuva-resumen-balance-sparkline" viewBox="0 0 220 49" fill="none" aria-hidden="true"><path d="M0 41 C25 40 28 26 49 30 S73 42 91 25 S123 7 141 24 S171 30 188 12 S207 11 220 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M0 41 C25 40 28 26 49 30 S73 42 91 25 S123 7 141 24 S171 30 188 12 S207 11 220 3 V49 H0Z" fill="currentColor" opacity=".08"/></svg>
            </div>
            <div className="nuva-resumen-device-money-grid">
              <div><span><i className="nuva-resumen-dot-gold" /> Ingresos</span><strong>{kpis ? fmtCLP(kpis.income) : "—"}</strong></div>
              <div><span><i className="nuva-resumen-dot-indigo" /> Gastos</span><strong>{kpis ? fmtCLP(kpis.expense) : "—"}</strong></div>
            </div>
            <div className="nuva-resumen-device-portfolio"><span className="nuva-resumen-portfolio-icon"><Package className="h-4 w-4" /></span><span><small>VALOR ESTIMADO DE INVENTARIO</small><strong>{kpis ? fmtCLP(kpis.inventoryValue) : "—"}</strong></span><ArrowUpRight className="h-4 w-4" /></div>
            <div className="nuva-resumen-status-card"><span className="nuva-resumen-status-symbol">{attentionCount === 0 ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}</span><div><strong>{attentionCount === 0 ? "Todo en orden" : `${attentionCount} indicadores por revisar`}</strong><p>{attentionCount === 0 ? "Sin alertas prioritarias en los datos disponibles." : `${kpis?.lowStockCount ?? 0} alertas de stock; revisa tus movimientos.`}</p></div><i className="nuva-resumen-status-light" /></div>
            <div className="nuva-resumen-device-bottom"><span className="nuva-resumen-bottom-active">Resumen</span><span>Operaciones</span><span>Finanzas</span></div>
          </article>

          <article className="nuva-resumen-device nuva-resumen-device-operations">
            <div className="nuva-resumen-device-status"><span>9:41</span><span className="nuva-resumen-device-island" /><span>•••</span></div>
            <div className="nuva-resumen-device-topline"><span className="nuva-resumen-avatar">nü</span><span className="nuva-resumen-device-kicker">CENTRO DE OPERACIONES</span><span className="nuva-resumen-notification">⌁</span></div>
            <div className="nuva-resumen-device-title"><span>Tu negocio</span><small>ACCESOS Y ACTIVIDAD</small></div>
            <div className="nuva-resumen-device-money-grid">
              <div><span><i className="nuva-resumen-dot-gold" /> Ventas</span><strong>{kpis?.salesCount ?? "—"}</strong></div>
              <div><span><i className="nuva-resumen-dot-indigo" /> Stock bajo</span><strong>{kpis?.lowStockCount ?? "—"}</strong></div>
            </div>
            <div className="nuva-resumen-operation-list">
              <p className="nuva-resumen-section-label">CONTINUAR TRABAJANDO</p>
              <Link to="/sales"><span className="nuva-resumen-operation-icon"><ShoppingBag className="h-4 w-4" /></span><span><strong>Ventas y operaciones</strong><small>Registros y actividad</small></span><ArrowUpRight className="h-4 w-4" /></Link>
              <Link to="/inventory"><span className="nuva-resumen-operation-icon"><Package className="h-4 w-4" /></span><span><strong>Inventario y stock</strong><small>Productos y existencias</small></span><ArrowUpRight className="h-4 w-4" /></Link>
              <Link to="/quotes"><span className="nuva-resumen-operation-icon"><Plus className="h-4 w-4" /></span><span><strong>Cotizaciones</strong><small>Propuestas comerciales</small></span><ArrowUpRight className="h-4 w-4" /></Link>
              <Link to="/finance"><span className="nuva-resumen-operation-icon"><TrendingUp className="h-4 w-4" /></span><span><strong>Finanzas</strong><small>Movimientos y resultados</small></span><ArrowUpRight className="h-4 w-4" /></Link>
            </div>
            <div className="nuva-resumen-device-footer-note"><CheckCircle2 className="h-3.5 w-3.5" /> Tus accesos directos están disponibles.</div>
            <div className="nuva-resumen-device-bottom"><span>Resumen</span><span className="nuva-resumen-bottom-active">Operaciones</span><span>Perfil</span></div>
          </article>
        </section>

        <section className="nuva-resumen-refine-row"><div><p className="nuva-resumen-section-label">LECTURA FINANCIERA</p><h2>Explora tus movimientos</h2><p>Los filtros del gráfico permiten revisar períodos y categorías específicas.</p></div></section>
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
