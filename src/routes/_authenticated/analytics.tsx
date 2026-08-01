import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBizList, fmtCLP } from "@/lib/biz-data";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Users, Package, DollarSign, X } from "lucide-react";
import { ModuleGuard } from "@/components/module-guard";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { DateRangeFilter, dmyToIso } from "@/components/date-range-filter";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Indicadores — Nüva One" }] }),
  component: Analytics,
});

const CHANNEL_LABEL: Record<string, string> = {
  tienda: "Tienda",
  online: "Online",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
};

const PAYMENT_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  credito: "Crédito",
};

function Analytics() {
  const { data: sales } = useBizList<any>("sales");
  const { data: products } = useBizList<any>("products");
  const { data: tx } = useBizList<any>("transactions");

  // --- Filtros ---------------------------------------------------------
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

  const isoFrom = dmyToIso(dateFrom);
  const isoTo = dmyToIso(dateTo);

  const productById: Record<string, any> = {};
  (products ?? []).forEach((p) => {
    productById[p.id] = p;
  });

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    (products ?? []).forEach((p) => p.category && set.add(p.category));
    return Array.from(set)
      .sort()
      .map((c) => ({ value: c, label: c }));
  }, [products]);

  const productOptions = useMemo(
    () => (products ?? []).map((p: any) => ({ value: p.id, label: p.name })),
    [products],
  );

  const channelOptions = useMemo(() => {
    const set = new Set<string>();
    (sales ?? []).forEach((s: any) => s.channel && set.add(s.channel));
    return Array.from(set).map((c) => ({ value: c, label: CHANNEL_LABEL[c] ?? c }));
  }, [sales]);

  const paymentOptions = useMemo(() => {
    const set = new Set<string>();
    (sales ?? []).forEach((s: any) => s.payment_method && set.add(s.payment_method));
    return Array.from(set).map((p) => ({ value: p, label: PAYMENT_LABEL[p] ?? p }));
  }, [sales]);

  const hasActiveFilters =
    !!dateFrom ||
    !!dateTo ||
    productIds.length > 0 ||
    categories.length > 0 ||
    channels.length > 0 ||
    paymentMethods.length > 0;

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setProductIds([]);
    setCategories([]);
    setChannels([]);
    setPaymentMethods([]);
  }

  // Una venta pasa el filtro de producto/categoría si al menos una de sus
  // líneas corresponde a un producto seleccionado (o de la categoría elegida).
  function saleMatchesProductOrCategory(sale: any): boolean {
    if (productIds.length === 0 && categories.length === 0) return true;
    const items = Array.isArray(sale.items) ? sale.items : [];
    return items.some((it: any) => {
      if (!it.product_id) return false;
      if (productIds.length > 0 && productIds.includes(it.product_id)) return true;
      const product = productById[it.product_id];
      if (categories.length > 0 && product?.category && categories.includes(product.category)) {
        return true;
      }
      return false;
    });
  }

  const filteredSales = useMemo(() => {
    return (sales ?? []).filter((s: any) => {
      if (isoFrom && s.sale_date < isoFrom) return false;
      if (isoTo && s.sale_date > isoTo) return false;
      if (channels.length > 0 && !channels.includes(s.channel)) return false;
      if (paymentMethods.length > 0 && !paymentMethods.includes(s.payment_method)) return false;
      if (!saleMatchesProductOrCategory(s)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, isoFrom, isoTo, channels, paymentMethods, productIds, categories]);

  const filteredTx = useMemo(() => {
    return (tx ?? []).filter((t: any) => {
      if (isoFrom && t.tx_date < isoFrom) return false;
      if (isoTo && t.tx_date > isoTo) return false;
      return true;
    });
  }, [tx, isoFrom, isoTo]);

  // --- KPIs sobre los datos ya filtrados --------------------------------
  const totalSales = filteredSales.reduce((s, x) => s + Number(x.total), 0);
  const avgTicket = filteredSales.length > 0 ? totalSales / filteredSales.length : 0;
  const income = filteredTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expense = filteredTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const cashFlowMargin = income > 0 ? ((income - expense) / income) * 100 : 0;
  const inventoryUnits = (products ?? []).reduce((s, p) => s + p.stock, 0);

  // Margen real: ingreso vs costo de mercadería vendida, según las líneas de
  // venta que sí referencian un producto (así conocemos su costo).
  let revenueFromItems = 0;
  let costFromItems = 0;
  filteredSales.forEach((s) => {
    (s.items ?? []).forEach((it: any) => {
      const qty = Number(it.qty) || 0;
      const price = Number(it.price) || 0;
      revenueFromItems += qty * price;
      const product = it.product_id ? productById[it.product_id] : null;
      if (product) costFromItems += qty * Number(product.cost ?? 0);
    });
  });
  const grossMargin =
    revenueFromItems > 0 ? ((revenueFromItems - costFromItems) / revenueFromItems) * 100 : null;

  const kpis = [
    {
      l: "Margen bruto (ventas)",
      v: grossMargin !== null ? `${grossMargin.toFixed(1)}%` : "Sin datos",
      i: TrendingUp,
    },
    { l: "Margen de caja", v: `${cashFlowMargin.toFixed(1)}%`, i: DollarSign },
    { l: "Ticket promedio", v: fmtCLP(avgTicket), i: DollarSign },
    { l: "Unidades en stock", v: String(inventoryUnits), i: Package },
    {
      l: "Clientes únicos",
      v: String(new Set(filteredSales.map((s) => s.customer_name)).size),
      i: Users,
    },
  ];

  // Ventas por canal
  const byChannel: Record<string, number> = {};
  filteredSales.forEach((s) => {
    byChannel[s.channel] = (byChannel[s.channel] ?? 0) + Number(s.total);
  });
  const channelData = Object.entries(byChannel).map(([channel, total]) => ({
    canal: CHANNEL_LABEL[channel] ?? channel,
    total,
  }));

  // Ventas por método de pago
  const byPayment: Record<string, number> = {};
  filteredSales.forEach((s) => {
    const key = s.payment_method ?? "sin registrar";
    byPayment[key] = (byPayment[key] ?? 0) + Number(s.total);
  });
  const paymentData = Object.entries(byPayment).map(([metodo, total]) => ({
    metodo: PAYMENT_LABEL[metodo] ?? metodo,
    total,
  }));

  // Evolución diaria de ventas en el rango filtrado
  const byDay: Record<string, number> = {};
  filteredSales.forEach((s) => {
    byDay[s.sale_date] = (byDay[s.sale_date] ?? 0) + Number(s.total);
  });
  const trendData = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, total]) => ({
      fecha: new Date(fecha + "T00:00:00").toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
      }),
      total,
    }));

  return (
    <ModuleGuard module="analytics">
      <>
        <PageHeader title="Indicadores" description="Las métricas clave de tu negocio" />

        <Card className="mt-4 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <DateRangeFilter
              from={dateFrom}
              to={dateTo}
              onFromChange={setDateFrom}
              onToChange={setDateTo}
            />
            <MultiSelectFilter
              label="Producto"
              options={productOptions}
              selected={productIds}
              onChange={setProductIds}
            />
            <MultiSelectFilter
              label="Categoría"
              options={categoryOptions}
              selected={categories}
              onChange={setCategories}
            />
            <MultiSelectFilter
              label="Canal"
              options={channelOptions}
              selected={channels}
              onChange={setChannels}
            />
            <MultiSelectFilter
              label="Método de pago"
              options={paymentOptions}
              selected={paymentMethods}
              onChange={setPaymentMethods}
            />
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3.5 w-3.5" /> Quitar filtros
              </Button>
            )}
          </div>
        </Card>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {kpis.map((k) => (
            <Card key={k.l} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{k.l}</span>
                <k.i className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2 text-2xl font-bold">{k.v}</div>
            </Card>
          ))}
        </div>

        <Card className="mt-6 p-6">
          <h3 className="font-semibold">Evolución de ventas</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 270)" />
              <XAxis dataKey="fecha" stroke="oklch(0.5 0.02 270)" fontSize={12} />
              <YAxis
                stroke="oklch(0.5 0.02 270)"
                fontSize={12}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: number) => fmtCLP(v)}
                contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 270)" }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="oklch(0.55 0.22 268)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-semibold">Ventas por canal</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 270)" />
                <XAxis dataKey="canal" stroke="oklch(0.5 0.02 270)" fontSize={12} />
                <YAxis
                  stroke="oklch(0.5 0.02 270)"
                  fontSize={12}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => fmtCLP(v)}
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 270)" }}
                />
                <Bar dataKey="total" fill="oklch(0.55 0.22 268)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold">Ventas por método de pago</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={paymentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 270)" />
                <XAxis dataKey="metodo" stroke="oklch(0.5 0.02 270)" fontSize={12} />
                <YAxis
                  stroke="oklch(0.5 0.02 270)"
                  fontSize={12}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => fmtCLP(v)}
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 270)" }}
                />
                <Bar dataKey="total" fill="oklch(0.6 0.18 200)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </>
    </ModuleGuard>
  );
}
