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
import { ExplainMyBusiness } from "@/components/explain-my-business";
import { BusinessInsightCard } from "@/components/business-insight-card";
import { PymeNewsRadar } from "@/components/pyme-news-radar";
import { TrendingUp, TrendingDown, ShoppingCart, Boxes, DollarSign, ArrowUpRight, X, CheckCircle2, Sparkles } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Resumen — Nüva One" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { active } = useActiveBusiness();
  const [onboardingFocus, setOnboardingFocus] = useState("Todo");

  useEffect(() => {
    try { setOnboardingFocus(localStorage.getItem("nuva-onboarding-focus") || "Todo"); } catch { /* restricted environments */ }
  }, []);

  const { data: kpis } = useQuery({
    enabled: !!active?.id,
    queryKey: ["kpis", active?.id],
    queryFn: async () => {
      const bid = active!.id;
      const [sales, expenses, products, salesCount] = await Promise.all([
        supabase.from("transactions").select("amount").eq("business_id", bid).eq("type", "income"),
        supabase.from("transactions").select("amount").eq("business_id", bid).eq("type", "expense"),
        supabase.from("products").select("stock, price").eq("business_id", bid),
        supabase.from("sales").select("id", { count: "exact", head: true }).eq("business_id", bid).neq("status", "cancelled"),
      ]);
      const income = (sales.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
      const expense = (expenses.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
      const inventoryValue = (products.data ?? []).reduce((s, r: any) => s + Number(r.stock) * Number(r.price), 0);
      return { income, expense, net: income - expense, inventoryValue, salesCount: salesCount.count ?? 0, productsCount: (products.data ?? []).length };
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
      const grouped = new Map<string, { date: string; income: number; expense: number }>();
      rows.forEach((r: any) => { const key = r.tx_date; const current = grouped.get(key) || { date: key, income: 0, expense: 0 }; if (r.type === "income") current.income += Number(r.amount); else current.expense += Number(r.amount); grouped.set(key, current); });
      return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
    }
    return rows.slice().sort((a: any, b: any) => String(a.tx_date).localeCompare(String(b.tx_date))).map((r: any) => ({ date: r.tx_date, income: r.type === "income" ? Number(r.amount) : 0, expense: r.type === "expense" ? Number(r.amount) : 0 }));
  }, [allTx, isoFrom, isoTo, categories]);

  return <ModuleGuard module="dashboard"><div className="space-y-6">
    <PageHeader title="Resumen ejecutivo" description="La visión operativa de tu negocio en un solo lugar." />
    <PymeNewsRadar />
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="Ingresos" value={fmtCLP(kpis?.income ?? 0)} icon={<TrendingUp className="h-4 w-4" />} />
      <MetricCard title="Gastos" value={fmtCLP(kpis?.expense ?? 0)} icon={<TrendingDown className="h-4 w-4" />} />
      <MetricCard title="Resultado" value={fmtCLP(kpis?.net ?? 0)} icon={<DollarSign className="h-4 w-4" />} />
      <MetricCard title="Inventario" value={fmtCLP(kpis?.inventoryValue ?? 0)} icon={<Boxes className="h-4 w-4" />} />
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2"><Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Evolución financiera</h2><p className="text-sm text-muted-foreground">Ingresos y gastos registrados.</p></div><div className="flex flex-wrap gap-2"><DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} /><MultiSelectFilter options={categoryOptions} value={categories} onChange={setCategories} placeholder="Categorías" />{hasChartFilters && <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setCategories([]); }}><X className="mr-1 h-3.5 w-3.5" />Limpiar</Button>}</div></div><div className="mt-5 h-[280px]">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip formatter={(value: number) => fmtCLP(value)} /><Area type="monotone" dataKey="income" name="Ingresos" fill="currentColor" fillOpacity={0.12} stroke="currentColor" /><Area type="monotone" dataKey="expense" name="Gastos" fill="currentColor" fillOpacity={0.06} stroke="currentColor" /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No hay movimientos para los filtros seleccionados.</div>}</div></Card></div>
      <div className="space-y-4"><NuvaScoreCard /><BusinessInsightCard /></div>
    </div>
    <ExplainMyBusiness />
  </div></ModuleGuard>;
}

function MetricCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) { return <Card className="p-5"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{title}</div><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p></Card>; }
