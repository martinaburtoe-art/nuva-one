import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { useBizList, fmtCLP } from "@/lib/biz-data";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, Users, Package, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Indicadores — Nüva One" }] }),
  component: Analytics,
});

function Analytics() {
  const { data: sales } = useBizList<any>("sales");
  const { data: products } = useBizList<any>("products");
  const { data: tx } = useBizList<any>("transactions");

  const totalSales = (sales ?? []).reduce((s, x) => s + Number(x.total), 0);
  const avgTicket = sales && sales.length > 0 ? totalSales / sales.length : 0;
  const income = (tx ?? [])
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expense = (tx ?? [])
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const cashFlowMargin = income > 0 ? ((income - expense) / income) * 100 : 0;
  const inventoryUnits = (products ?? []).reduce((s, p) => s + p.stock, 0);

  // Real product margin: revenue vs cost of goods sold, from sale line items
  // that reference an actual product (so we know its cost). Falls back to 0
  // if no sale has product-linked items yet.
  const productById: Record<string, any> = {};
  (products ?? []).forEach((p) => {
    productById[p.id] = p;
  });
  let revenueFromItems = 0;
  let costFromItems = 0;
  (sales ?? []).forEach((s) => {
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
      v: String(new Set((sales ?? []).map((s) => s.customer_name)).size),
      i: Users,
    },
  ];

  // Sales by channel
  const byChannel: Record<string, number> = {};
  (sales ?? []).forEach((s) => {
    byChannel[s.channel] = (byChannel[s.channel] ?? 0) + Number(s.total);
  });
  const channelData = Object.entries(byChannel).map(([canal, total]) => ({ canal, total }));

  return (
    <>
      <PageHeader title="Indicadores" description="Las métricas clave de tu negocio" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
    </>
  );
}
