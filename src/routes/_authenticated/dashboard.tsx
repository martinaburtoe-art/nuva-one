import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Boxes,
  DollarSign,
  ArrowUpRight,
  X,
  MessageCircle,
  Circle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Resumen — Nüva One" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { active } = useActiveBusiness();

  const { data: kpis } = useQuery({
    enabled: !!active?.id,
    queryKey: ["kpis", active?.id],
    queryFn: async () => {
      const bid = active!.id;
      const [sales, expenses, products, salesCount] = await Promise.all([
        supabase.from("transactions").select("amount").eq("business_id", bid).eq("type", "income"),
        supabase.from("transactions").select("amount").eq("business_id", bid).eq("type", "expense"),
        supabase.from("products").select("stock, price").eq("business_id", bid),
        supabase
          .from("sales")
          .select("id", { count: "exact", head: true })
          .eq("business_id", bid)
          .neq("status", "cancelled"),
      ]);
      const income = (sales.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
      const expense = (expenses.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
      const inventoryValue = (products.data ?? []).reduce(
        (s, r: any) => s + Number(r.stock) * Number(r.price),
        0,
      );
      return {
        income,
        expense,
        net: income - expense,
        inventoryValue,
        salesCount: salesCount.count ?? 0,
        productsCount: (products.data ?? []).length,
      };
    },
  });

  // Filtros del gráfico de ingresos/gastos
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const isoFrom = dmyToIso(dateFrom);
  const isoTo = dmyToIso(dateTo);

  // Trae todas las transacciones una vez; el filtrado/agrupado se hace en el
  // cliente para poder alternar entre vista mensual (por defecto) y diaria
  // (cuando se elige un rango de fechas puntual) sin re-consultar.
  const { data: allTx } = useQuery({
    enabled: !!active?.id,
    queryKey: ["chart-tx", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("amount, type, tx_date, category")
        .eq("business_id", active!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    (allTx ?? []).forEach((t: any) => t.category && set.add(t.category));
    return Array.from(set)
      .sort()
      .map((c) => ({ value: c, label: c }));
  }, [allTx]);

  const hasChartFilters = !!dateFrom || !!dateTo || categories.length > 0;

  const chartData = useMemo(() => {
    const rows = (allTx ?? []).filter((r: any) => {
      if (isoFrom && r.tx_date < isoFrom) return false;
      if (isoTo && r.tx_date > isoTo) return false;
      if (categories.length > 0 && !categories.includes(r.category)) return false;
      return true;
    });

    // Con rango de fechas propio: agrupar por día. Sin rango: últimos 6 meses.
    if (isoFrom || isoTo) {
      const byDay: Record<string, { fecha: string; ingresos: number; gastos: number }> = {};
      rows.forEach((r: any) => {
        const key = r.tx_date;
        if (!byDay[key]) {
          byDay[key] = {
            fecha: new Date(key + "T00:00:00").toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "2-digit",
            }),
            ingresos: 0,
            gastos: 0,
          };
        }
        if (r.type === "income") byDay[key].ingresos += Number(r.amount);
        else byDay[key].gastos += Number(r.amount);
      });
      return Object.keys(byDay)
        .sort()
        .map((k) => byDay[k]);
    }

    const byMonth: Record<string, { mes: string; ingresos: number; gastos: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      byMonth[key] = {
        mes: d.toLocaleDateString("es-CL", { month: "short" }),
        ingresos: 0,
        gastos: 0,
      };
    }
    rows.forEach((r: any) => {
      const d = new Date(r.tx_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (byMonth[key]) {
        if (r.type === "income") byMonth[key].ingresos += Number(r.amount);
        else byMonth[key].gastos += Number(r.amount);
      }
    });
    return Object.values(byMonth);
  }, [allTx, isoFrom, isoTo, categories]);

  const cards = [
    { l: "Ingresos", v: fmtCLP(kpis?.income ?? 0), i: TrendingUp, c: "text-success" },
    { l: "Gastos", v: fmtCLP(kpis?.expense ?? 0), i: TrendingDown, c: "text-destructive" },
    { l: "Flujo neto", v: fmtCLP(kpis?.net ?? 0), i: DollarSign, c: "text-primary" },
    { l: "Ventas", v: String(kpis?.salesCount ?? 0), i: ShoppingCart, c: "text-foreground" },
    { l: "Valor inventario", v: fmtCLP(kpis?.inventoryValue ?? 0), i: Boxes, c: "text-foreground" },
  ];

  return (
    <ModuleGuard module="dashboard">
      <>
        <PageHeader
          title={`Hola, ${active?.name ?? "negocio"}`}
          description="Esto es lo que está pasando hoy."
        />

        {kpis !== undefined && kpis.productsCount === 0 && kpis.salesCount === 0 && (
          <Card className="mb-6 border-primary/30 bg-accent/40 p-6">
            <h3 className="font-semibold">Primeros pasos con Nüva One</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tu negocio está creado. Estos 3 pasos toman menos de 10 minutos y dejan tu cuenta
              lista para operar de verdad.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Link
                to="/inventory"
                className="flex items-start gap-2 rounded-lg border border-border bg-background p-3 transition-all hover:border-primary hover:shadow-soft"
              >
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Carga tus primeros productos</div>
                  <div className="text-xs text-muted-foreground">Inventario</div>
                </div>
              </Link>
              <Link
                to="/pos"
                className="flex items-start gap-2 rounded-lg border border-border bg-background p-3 transition-all hover:border-primary hover:shadow-soft"
              >
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Registra tu primera venta</div>
                  <div className="text-xs text-muted-foreground">Caja / POS</div>
                </div>
              </Link>
              <Link
                to="/automations"
                className="flex items-start gap-2 rounded-lg border border-border bg-background p-3 transition-all hover:border-primary hover:shadow-soft"
              >
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Vincula tu WhatsApp</div>
                  <div className="text-xs text-muted-foreground">
                    Consulta tu negocio desde el celular
                  </div>
                </div>
              </Link>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <Card key={c.l} className="p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{c.l}</span>
                <c.i className={`h-4 w-4 ${c.c}`} />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight">{c.v}</div>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <NuvaScoreCard />
            <ExplainMyBusiness />
          </div>

          <Card className="p-6 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Ingresos vs Gastos</h3>
                <p className="text-xs text-muted-foreground">
                  {isoFrom || isoTo ? "Rango seleccionado" : "Últimos 6 meses"}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <DateRangeFilter
                  from={dateFrom}
                  to={dateTo}
                  onFromChange={setDateFrom}
                  onToChange={setDateTo}
                />
                <MultiSelectFilter
                  label="Categoría"
                  options={categoryOptions}
                  selected={categories}
                  onChange={setCategories}
                />
                {hasChartFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                      setCategories([]);
                    }}
                  >
                    <X className="mr-1 h-3.5 w-3.5" /> Quitar filtros
                  </Button>
                )}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData ?? []}>
                <defs>
                  <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.22 268)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.65 0.22 268)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.6 0.22 25)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.6 0.22 25)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 270)" />
                <XAxis
                  dataKey={isoFrom || isoTo ? "fecha" : "mes"}
                  stroke="oklch(0.5 0.02 270)"
                  fontSize={12}
                />
                <YAxis
                  stroke="oklch(0.5 0.02 270)"
                  fontSize={12}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 270)" }}
                />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  stroke="oklch(0.55 0.22 268)"
                  fill="url(#gi)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="gastos"
                  stroke="oklch(0.6 0.22 25)"
                  fill="url(#ge)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold">Acciones rápidas</h3>
            <p className="text-xs text-muted-foreground">Lo más usado</p>
            <div className="mt-4 space-y-2">
              {[
                { l: "Registrar venta", h: "/sales" },
                { l: "Agregar producto", h: "/inventory" },
                { l: "Nueva cotización", h: "/quotes" },
                { l: "Registrar gasto", h: "/finance" },
              ].map((a) => (
                <Link
                  key={a.l}
                  to={a.h}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:border-primary hover:bg-accent"
                >
                  {a.l} <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </>
    </ModuleGuard>
  );
}
