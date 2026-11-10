import "@/resumen-premium.css";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, dmyToIso } from "@/components/date-range-filter";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { ModuleGuard } from "@/components/module-guard";
import { NuvaScoreCard } from "@/components/nuva-score-card";
import { fmtCLP } from "@/lib/biz-data";
import { goalsLabel } from "@/lib/resumen-goals";
import { getResumenOperationalStatus } from "@/lib/resumen-operational-status";
import { buildResumenChartData } from "@/lib/resumen-chart-data";
import { calculateInventoryValueAtCost } from "@/lib/resumen-inventory-value";
import { fetchAllResumenRows } from "@/lib/resumen-fetch-all";
import { toast } from "sonner";
import { ArrowUpRight, CheckCircle2, Sparkles, ShieldAlert, TrendingUp, Package, ShoppingBag, Plus, ArrowDownRight, FileText, Users, Wallet } from "lucide-react";
const DashboardChart = lazy(() => import("@/components/dashboard-chart").then((m) => ({ default: m.DashboardChart })));

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Resumen — Nüva One" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { active } = useActiveBusiness();
  const [onboardingFocus, setOnboardingFocus] = useState("Todo");
  const [seedingDemo, setSeedingDemo] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const isoFrom = dmyToIso(dateFrom);
  const isoTo = dmyToIso(dateTo);
  const chartWindowStart = useMemo(() => {
    if (isoFrom) return isoFrom;
    if (isoTo) return null; // Solo fecha final: incluir todo el histórico anterior.
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    d.setDate(1);
    // Fecha local para evitar desplazamientos de día en Chile (UTC-4).
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [isoFrom, isoTo]);
  const dailyChart = Boolean(isoFrom && isoTo && Date.parse(isoTo) - Date.parse(isoFrom) <= 62 * 86_400_000);
  const financialPeriodLabel = isoFrom || isoTo ? "Rango seleccionado" : "Últimos seis meses";

  useEffect(() => {
    try { setOnboardingFocus(localStorage.getItem("nuva.onboarding_goal") || "Todo"); }
    catch { setOnboardingFocus("Todo"); }
  }, []);

  const { data: kpis, error: kpisError } = useQuery({
    enabled: !!active?.id,
    queryKey: ["kpis", active?.id, chartWindowStart, isoTo, categories],
    queryFn: async () => {
      const bid = active!.id;
      const [sales, expenses, products, salesCount] = await Promise.all([
        fetchAllResumenRows((from, to) => {
          let query = supabase.from("transactions").select("id, amount").eq("business_id", bid).eq("type", "income");
          if (chartWindowStart) query = query.gte("tx_date", chartWindowStart);
          if (isoTo) query = query.lte("tx_date", isoTo);
          if (categories.length > 0) query = query.in("category", categories);
          return query.order("id").range(from, to);
        }),
        fetchAllResumenRows((from, to) => {
          let query = supabase.from("transactions").select("id, amount").eq("business_id", bid).eq("type", "expense");
          if (chartWindowStart) query = query.gte("tx_date", chartWindowStart);
          if (isoTo) query = query.lte("tx_date", isoTo);
          if (categories.length > 0) query = query.in("category", categories);
          return query.order("id").range(from, to);
        }),
        fetchAllResumenRows((from, to) =>
          supabase.from("products").select("id, stock, cost, low_stock_threshold, reorder_point")
            .eq("business_id", bid).order("id").range(from, to),
        ),
        supabase.from("sales").select("id", { count: "exact", head: true }).eq("business_id", bid).neq("status", "cancelled"),
      ]);
      if (salesCount.error) throw salesCount.error;
      const income = sales.reduce((s: number, r: any) => s + Number(r.amount), 0);
      const expense = expenses.reduce((s: number, r: any) => s + Number(r.amount), 0);
      const inventoryValue = calculateInventoryValueAtCost(products);
      const lowStockCount = products.filter((r: any) => {
        const stock = Number(r.stock ?? 0);
        const threshold = Number(r.low_stock_threshold ?? r.reorder_point ?? 0);
        return threshold > 0 && stock <= threshold;
      }).length;
      return { income, expense, net: income - expense, inventoryValue, salesCount: salesCount.count ?? 0, productsCount: products.length, lowStockCount };
    },
  });

  // Cada módulo se consulta por separado: un fallo parcial no debe ocultar
  // los datos válidos de los otros módulos del Resumen.
  const quotesQuery = useQuery({
    enabled: !!active?.id,
    queryKey: ["dashboard-quotes", active?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const data = await fetchAllResumenRows((from, to) =>
        supabase.from("quotes").select("id,status,total")
          .eq("business_id", active!.id).order("id").range(from, to),
      );
      const pending = data.filter((quote: any) =>
        ["draft", "sent", "viewed"].includes(String(quote.status).toLowerCase()),
      );
      return {
        count: pending.length,
        value: pending.reduce((sum: number, quote: any) => sum + Number(quote.total ?? 0), 0),
      };
    },
  });

  const customersQuery = useQuery({
    enabled: !!active?.id,
    queryKey: ["dashboard-customers", active?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", active!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const cashRegisterQuery = useQuery({
    enabled: !!active?.id,
    queryKey: ["dashboard-cash-register", active?.id],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("id,opened_at,opening_amount")
        .eq("business_id", active!.id)
        .eq("status", "open")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const integrations = {
    pendingQuotes: quotesQuery.data?.count,
    pendingQuoteValue: quotesQuery.data?.value,
    customersCount: customersQuery.data,
    cashRegister: cashRegisterQuery.data,
  };
  const integrationErrors = [
    quotesQuery.error,
    customersQuery.error,
    cashRegisterQuery.error,
  ].filter(Boolean);

  const { data: allTx, error: txError } = useQuery({
    enabled: !!active?.id,
    queryKey: ["chart-tx", active?.id, chartWindowStart, isoTo],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      return fetchAllResumenRows((from, to) => {
        let query = supabase
          .from("transactions")
          .select("id, amount, type, tx_date, category")
          .eq("business_id", active!.id);
        if (chartWindowStart) query = query.gte("tx_date", chartWindowStart);
        if (isoTo) query = query.lte("tx_date", isoTo);
        return query.order("id").range(from, to);
      });
    },
  });

  const qc = useQueryClient();


  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    (allTx ?? []).forEach((t: any) => t.category && set.add(t.category));
    return Array.from(set).sort().map((c) => ({ value: c, label: c }));
  }, [allTx]);


  const chartData = useMemo(
    () => buildResumenChartData(allTx ?? [], {
      from: isoFrom,
      to: isoTo,
      categories,
      daily: dailyChart,
    }),
    [allTx, isoFrom, isoTo, categories, dailyChart],
  );

  const focusAction = onboardingFocus === "sales" ? { label: "Registra tu primera venta", href: "/pos" } : onboardingFocus === "inventory" ? { label: "Carga tus primeros productos", href: "/inventory" } : onboardingFocus === "finance" ? { label: "Registra tu primer movimiento", href: "/finance" } : onboardingFocus === "customers" ? { label: "Crea tu primer cliente", href: "/customers" } : { label: "Completa tu primera operación", href: "/sales" };
  const hasActivity = (kpis?.productsCount ?? 0) > 0 || (kpis?.salesCount ?? 0) > 0 || (kpis?.income ?? 0) > 0 || (kpis?.expense ?? 0) > 0;
  async function loadDemoBusiness() {
    const confirmed = window.confirm("Se creará un negocio de demostración y pasará a ser el negocio activo. Tu negocio actual no se modifica. ¿Quieres continuar?");
    if (!confirmed) return;
    setSeedingDemo(true);
    try {
      const { data, error } = await supabase.rpc("create_demo_business_for_current_user");
      if (error) throw error;
      localStorage.setItem("novaflow.active_business_id", data);
      window.location.assign("/dashboard");
    } catch (error: unknown) {
      console.error("No se pudo preparar el negocio de demostración", error);
      toast.error("No pudimos preparar el espacio de demostración");
    } finally {
      setSeedingDemo(false);
    }
  }
  const operationalStatus = getResumenOperationalStatus({
    loading: kpis === undefined && !kpisError,
    kpisError: Boolean(kpisError),
    integrationErrorCount: integrationErrors.length,
    lowStockCount: kpis?.lowStockCount ?? 0,
    net: kpis?.net,
  });

  return (
    <ModuleGuard module="dashboard">
      <main className="nuva-resumen-canvas">
        <header className="nuva-resumen-header">
          <div className="nuva-resumen-heading">
            <div>
              <p className="nuva-resumen-overline">VISTA GENERAL <span aria-hidden="true">/</span> NEGOCIO</p>
              <h1>Resumen</h1>
              <p className="nuva-resumen-subtitle">Una lectura clara de tus operaciones, resultados y próximos focos de atención.</p>
            </div>
            {!hasActivity && <Button variant="outline" size="sm" className="nuva-resumen-demo-button" onClick={loadDemoBusiness} disabled={seedingDemo}>
              {seedingDemo ? "Preparando demo…" : "Crear espacio demo"}
            </Button>}
          </div>
        </header>

        <section className="nuva-resumen-mobile-brief" aria-label="Pulso del negocio">
          <div className="nuva-resumen-mobile-brief-head">
            <span className="nuva-resumen-section-label">PULSO OPERATIVO</span>
            <span className={operationalStatus.tone === "clear" ? "nuva-resumen-status-pill is-clear" : operationalStatus.tone === "attention" ? "nuva-resumen-status-pill is-attention" : "nuva-resumen-status-pill"}>{operationalStatus.label}</span>
          </div>
          <div className="nuva-resumen-mobile-brief-grid">
            <Link to="/sales" className="nuva-resumen-mobile-brief-item"><span>Ventas</span><strong>{kpis?.salesCount ?? "—"}</strong><small>registradas</small></Link>
            <Link to="/inventory" className="nuva-resumen-mobile-brief-item"><span>Stock bajo</span><strong className={kpis?.lowStockCount ? "nuva-resumen-value-attention" : ""}>{kpis?.lowStockCount ?? "—"}</strong><small>por revisar</small></Link>
            <Link to="/pos" className="nuva-resumen-mobile-brief-item"><span>Caja</span><strong>{cashRegisterQuery.isLoading ? "—" : cashRegisterQuery.isError ? "N/D" : integrations.cashRegister ? "Abierta" : "Cerrada"}</strong><small>estado actual</small></Link>
          </div>
        </section>

        <div className="nuva-resumen-toolbar" aria-label="Filtros del resumen">
          <div className="nuva-resumen-toolbar-context">
            <span className="nuva-resumen-section-label">PERÍODO Y CATEGORÍA</span>
            <strong>{financialPeriodLabel}</strong>
            <p>Los indicadores financieros y el gráfico comparten estos filtros.</p>
          </div>
          <div className="nuva-resumen-filters">
            <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
            <MultiSelectFilter label="Categoría" options={categoryOptions} selected={categories} onChange={setCategories} />
          </div>
        </div>

        {kpis === undefined && !kpisError && !txError && (
          <div className="nuva-resumen-feedback" role="status">
            <span className="nuva-resumen-feedback-mark" />
            <div><strong>Cargando información del negocio</strong><p>Estamos reuniendo tus indicadores y movimientos.</p></div>
          </div>
        )}

        {kpisError && (
          <div role="alert" className="nuva-resumen-feedback nuva-resumen-feedback-error">
            <ShieldAlert className="h-5 w-5" />
            <div><strong>No se pudieron cargar los indicadores</strong><p>{String(kpisError?.message ?? kpisError ?? "Error desconocido")}</p></div>
            <Button size="sm" variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["kpis", active?.id] })}>Reintentar</Button>
          </div>
        )}

        {txError && (
          <div role="alert" className="nuva-resumen-feedback nuva-resumen-feedback-error">
            <ShieldAlert className="h-5 w-5" />
            <div><strong>No se pudieron cargar los movimientos</strong><p>{String(txError?.message ?? txError ?? "Error desconocido")}</p></div>
            <Button size="sm" variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["chart-tx", active?.id, chartWindowStart, isoTo] })}>Reintentar</Button>
          </div>
        )}

        {integrationErrors.length > 0 && (
          <div role="alert" className="nuva-resumen-feedback nuva-resumen-feedback-error">
            <ShieldAlert className="h-5 w-5" />
            <div>
              <strong>Algunos indicadores no están disponibles</strong>
              <p>{integrationErrors.map((error: any) => String(error?.message ?? "Error desconocido")).join(" · ")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {quotesQuery.isError && <Button size="sm" variant="outline" onClick={() => void quotesQuery.refetch()}>Reintentar cotizaciones</Button>}
              {customersQuery.isError && <Button size="sm" variant="outline" onClick={() => void customersQuery.refetch()}>Reintentar clientes</Button>}
              {cashRegisterQuery.isError && <Button size="sm" variant="outline" onClick={() => void cashRegisterQuery.refetch()}>Reintentar caja</Button>}
            </div>
          </div>
        )}

        {kpis !== undefined && !hasActivity && (
          <section className="nuva-resumen-onboarding">
            <div className="nuva-resumen-onboarding-copy">
              <span className="nuva-resumen-section-label"><Sparkles className="h-4 w-4" /> CONFIGURACIÓN INICIAL</span>
              <h2>Tu espacio está listo para empezar.</h2>
              <p>Comienza con {goalsLabel(onboardingFocus).toLowerCase()} y convierte tus operaciones en información útil para decidir.</p>
              <Link to={focusAction.href}><Button size="sm">{focusAction.label}<ArrowUpRight className="ml-1 h-4 w-4" /></Button></Link>
            </div>
            <div className="nuva-resumen-steps">
              <ActivationStep done title="Negocio creado" />
              <ActivationStep done={hasActivity} title="Primera operación" />
              <ActivationStep done={(kpis?.productsCount ?? 0) > 0 && (kpis?.salesCount ?? 0) > 0} title="Datos conectados" />
              <ActivationStep done={false} title="Primer análisis" />
            </div>
          </section>
        )}

        <section className="nuva-resumen-kpi-grid" aria-label="Indicadores principales">
          <article className="nuva-resumen-kpi nuva-resumen-kpi-primary">
            <div className="nuva-resumen-kpi-top"><span>RESULTADO DEL PERÍODO</span><span className="nuva-resumen-kpi-icon"><TrendingUp className="h-4 w-4" /></span></div>
            <strong>{kpis ? fmtCLP(kpis.net) : "—"}</strong>
            <p className={kpis && kpis.net < 0 ? "nuva-resumen-negative" : "nuva-resumen-positive"}>{kpis && kpis.net < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}{kpis && kpis.net < 0 ? "Resultado negativo" : "Ingresos menos gastos"}</p>
          </article>
          <article className="nuva-resumen-kpi">
            <div className="nuva-resumen-kpi-top"><span>INGRESOS DEL PERÍODO</span><span className="nuva-resumen-kpi-icon"><ArrowUpRight className="h-4 w-4" /></span></div>
            <strong>{kpis ? fmtCLP(kpis.income) : "—"}</strong>
            <p>{financialPeriodLabel}</p>
          </article>
          <article className="nuva-resumen-kpi">
            <div className="nuva-resumen-kpi-top"><span>GASTOS DEL PERÍODO</span><span className="nuva-resumen-kpi-icon"><ArrowDownRight className="h-4 w-4" /></span></div>
            <strong>{kpis ? fmtCLP(kpis.expense) : "—"}</strong>
            <p>{financialPeriodLabel}</p>
          </article>
          <article className="nuva-resumen-kpi">
            <div className="nuva-resumen-kpi-top"><span>INVENTARIO AL COSTO</span><span className="nuva-resumen-kpi-icon"><Package className="h-4 w-4" /></span></div>
            <strong>{kpis ? fmtCLP(kpis.inventoryValue) : "—"}</strong>
            <p>{kpis?.productsCount ?? "—"} productos registrados</p>
          </article>
        </section>

        <section className="nuva-resumen-workspace-grid">
          <article className="nuva-resumen-panel nuva-resumen-operations-panel">
            <div className="nuva-resumen-panel-heading">
              <div><p className="nuva-resumen-section-label">SEGUIMIENTO</p><h2>Estado operativo</h2></div>
              <span className={operationalStatus.tone === "clear" ? "nuva-resumen-status-pill is-clear" : operationalStatus.tone === "attention" ? "nuva-resumen-status-pill is-attention" : "nuva-resumen-status-pill"}>{operationalStatus.label}</span>
            </div>
            <div className="nuva-resumen-operational-stats">
              <div><span>Ventas registradas</span><strong>{kpis?.salesCount ?? "—"}</strong></div>
              <div><span>Productos con stock bajo</span><strong className={kpis?.lowStockCount ? "nuva-resumen-value-attention" : ""}>{kpis?.lowStockCount ?? "—"}</strong></div>
              <div><span>Cotizaciones abiertas</span><strong>{quotesQuery.isLoading ? "—" : quotesQuery.isError ? "—" : integrations.pendingQuotes ?? 0}</strong></div>
              <div><span>Clientes registrados</span><strong>{customersQuery.isLoading ? "—" : customersQuery.isError ? "—" : integrations.customersCount ?? 0}</strong></div>
              <div><span>Estado de caja</span><strong>{cashRegisterQuery.isLoading ? "—" : cashRegisterQuery.isError ? "No disponible" : integrations.cashRegister ? "Abierta" : "Cerrada"}</strong></div>
              <div><span>Valor cotizado</span><strong>{quotesQuery.isLoading || quotesQuery.isError ? "—" : fmtCLP(integrations.pendingQuoteValue ?? 0)}</strong></div>
            </div>
            <div className="nuva-resumen-status-copy">
              {operationalStatus.description}
            </div>
          </article>

          <article className="nuva-resumen-panel nuva-resumen-shortcuts-panel">
            <div className="nuva-resumen-panel-heading"><div><p className="nuva-resumen-section-label">ACCESO DIRECTO</p><h2>Continúa tu trabajo</h2></div></div>
            <nav className="nuva-resumen-shortcuts" aria-label="Accesos directos">
              <Link to="/pos"><span><ShoppingBag className="h-4 w-4" /></span><strong>Caja</strong><ArrowUpRight className="h-3.5 w-3.5" /></Link>
              <Link to="/sales"><span><TrendingUp className="h-4 w-4" /></span><strong>Ventas</strong><ArrowUpRight className="h-3.5 w-3.5" /></Link>
              <Link to="/inventory"><span><Package className="h-4 w-4" /></span><strong>Inventario</strong><ArrowUpRight className="h-3.5 w-3.5" /></Link>
              <Link to="/quotes"><span><FileText className="h-4 w-4" /></span><strong>Cotizaciones</strong><ArrowUpRight className="h-3.5 w-3.5" /></Link>
              <Link to="/customers"><span><Users className="h-4 w-4" /></span><strong>Clientes</strong><ArrowUpRight className="h-3.5 w-3.5" /></Link>
              <Link to="/finance"><span><Wallet className="h-4 w-4" /></span><strong>Finanzas</strong><ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </nav>
          </article>
        </section>

        <section className="nuva-resumen-panel nuva-resumen-chart-panel" aria-label="Rendimiento financiero">
          <div className="nuva-resumen-panel-heading nuva-resumen-chart-heading">
            <div><p className="nuva-resumen-section-label">EVOLUCIÓN FINANCIERA</p><h2>Ingresos y gastos</h2><p>Comparación de movimientos dentro del contexto seleccionado arriba.</p></div>
          </div>
          <div className="nuva-resumen-device-chart" role="img" aria-label="Gráfico de ingresos y gastos del negocio">
            <Suspense fallback={<div className="nuva-resumen-chart-loading" role="status" aria-label="Cargando gráfico" />}><DashboardChart data={chartData ?? []} filtered={dailyChart} /></Suspense>
          </div>
          <div className="nuva-resumen-chart-legend"><span><i className="nuva-resumen-dot-gold" /> Ingresos</span><span><i className="nuva-resumen-dot-indigo" /> Gastos</span></div>
        </section>

        <section className="nuva-resumen-score-section">
          <div><p className="nuva-resumen-section-label">INTELIGENCIA DE NEGOCIO</p><h2>Salud de tu empresa</h2><p>Indicadores complementarios para entender el estado general de tu negocio.</p></div>
          <div className="nuva-resumen-score-card"><NuvaScoreCard /></div>
        </section>

        <footer className="nuva-resumen-footer"><span>NÜVA ONE <span>·</span> RESUMEN</span><span>Indicadores calculados a partir de los movimientos registrados en tu negocio.</span></footer>
      </main>
    </ModuleGuard>
  );
}

function OperationalCard({ icon, label, value, description, href }: { icon: React.ReactNode; label: string; value: string | number; description: string; href: string }) {
  return <Link to={href} className="block"><Card className="h-full p-5 transition-colors hover:bg-muted/30"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div></div><p className="mt-3 text-xs text-muted-foreground">{description}</p></Card></Link>;
}

function ActivationStep({ done, title }: { done: boolean; title: string }) { return <div className="flex items-center gap-2 rounded-xl border bg-background/70 px-3 py-2 text-xs"><CheckCircle2 className={`h-4 w-4 ${done ? "text-primary" : "text-muted-foreground/40"}`} /><span className={done ? "font-medium" : "text-muted-foreground"}>{title}</span></div>; }

