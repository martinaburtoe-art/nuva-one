import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { fmtCLP } from "@/lib/biz-data";
import { TrendingUp, TrendingDown, ShoppingCart, Boxes, DollarSign, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Resumen — NovaFlow" }] }),
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
        supabase.from("sales").select("id", { count: "exact", head: true }).eq("business_id", bid),
      ]);
      const income = (sales.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
      const expense = (expenses.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
      const inventoryValue = (products.data ?? []).reduce((s, r: any) => s + Number(r.stock) * Number(r.price), 0);
      return {
        income, expense, net: income - expense, inventoryValue,
        salesCount: salesCount.count ?? 0,
      };
    },
  });

  // Build a 6-month chart from transactions
  const { data: chartData } = useQuery({
    enabled: !!active?.id,
    queryKey: ["chart", active?.id],
    queryFn: async () => {
      const { data } = await supabase.from("transactions")
        .select("amount, type, tx_date")
        .eq("business_id", active!.id);
      const byMonth: Record<string, { mes: string; ingresos: number; gastos: number }> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        byMonth[key] = { mes: d.toLocaleDateString("es-CL", { month: "short" }), ingresos: 0, gastos: 0 };
      }
      (data ?? []).forEach((r: any) => {
        const d = new Date(r.tx_date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (byMonth[key]) {
          if (r.type === "income") byMonth[key].ingresos += Number(r.amount);
          else byMonth[key].gastos += Number(r.amount);
        }
      });
      return Object.values(byMonth);
    },
  });

  const cards = [
    { l: "Ingresos", v: fmtCLP(kpis?.income ?? 0), i: TrendingUp, c: "text-success" },
    { l: "Gastos", v: fmtCLP(kpis?.expense ?? 0), i: TrendingDown, c: "text-destructive" },
    { l: "Flujo neto", v: fmtCLP(kpis?.net ?? 0), i: DollarSign, c: "text-primary" },
    { l: "Ventas", v: String(kpis?.salesCount ?? 0), i: ShoppingCart, c: "text-foreground" },
    { l: "Valor inventario", v: fmtCLP(kpis?.inventoryValue ?? 0), i: Boxes, c: "text-foreground" },
  ];

  return (
    <>
      <PageHeader title={`Hola, ${active?.name ?? "negocio"}`} description="Esto es lo que está pasando hoy." />

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
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Ingresos vs Gastos</h3>
              <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
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
              <XAxis dataKey="mes" stroke="oklch(0.5 0.02 270)" fontSize={12} />
              <YAxis stroke="oklch(0.5 0.02 270)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 270)" }} />
              <Area type="monotone" dataKey="ingresos" stroke="oklch(0.55 0.22 268)" fill="url(#gi)" strokeWidth={2} />
              <Area type="monotone" dataKey="gastos" stroke="oklch(0.6 0.22 25)" fill="url(#ge)" strokeWidth={2} />
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
              <a key={a.l} href={a.h} className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:border-primary hover:bg-accent">
                {a.l} <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
