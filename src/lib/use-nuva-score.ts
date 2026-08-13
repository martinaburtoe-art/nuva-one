import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";

// Nüva Score: 5 componentes de 0 a 20 puntos cada uno, sumando 0-100.
// Cada componente se calcula desde datos reales ya existentes en el
// negocio -- no hay heurísticas inventadas ni valores de relleno. Si no
// hay datos suficientes para un componente, ese componente se omite del
// promedio en vez de penalizar o inflar el score con un supuesto.

export type ScoreComponent = {
  key: string;
  label: string;
  points: number; // 0-20, o null si no hay datos suficientes
  detail: string;
  status: "good" | "warning" | "critical" | "no-data";
};

export type NuvaScore = {
  total: number | null; // null si no hay ningún componente calculable
  components: ScoreComponent[];
};

function scoreFromRatio(ratio: number, goodAt: number, badAt: number): number {
  // ratio ascendente es bueno (ej: margen). goodAt >= badAt.
  if (goodAt >= badAt) {
    if (ratio >= goodAt) return 20;
    if (ratio <= badAt) return 0;
    return Math.round(((ratio - badAt) / (goodAt - badAt)) * 20);
  }
  // ratio ascendente es malo (ej: % vencido). goodAt <= badAt.
  if (ratio <= goodAt) return 20;
  if (ratio >= badAt) return 0;
  return Math.round(((badAt - ratio) / (badAt - goodAt)) * 20);
}

function statusFromPoints(points: number): ScoreComponent["status"] {
  if (points >= 14) return "good";
  if (points >= 7) return "warning";
  return "critical";
}

export function useNuvaScore() {
  const { active } = useActiveBusiness();

  return useQuery({
    enabled: !!active?.id,
    queryKey: ["nuva-score", active?.id],
    queryFn: async (): Promise<NuvaScore> => {
      const bid = active!.id;
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .slice(0, 10);
      const last30 = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
      const todayIso = now.toISOString().slice(0, 10);

      const [txRes, productsRes, salesRes, creditSalesRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("type, amount, tx_date")
          .eq("business_id", bid)
          .gte("tx_date", last30),
        supabase
          .from("products")
          .select("cost, price, stock, low_stock_threshold")
          .eq("business_id", bid),
        supabase
          .from("sales")
          .select("total, items, sale_date")
          .eq("business_id", bid)
          .neq("status", "cancelled")
          .gte("sale_date", startOfLastMonth),
        supabase
          .from("sales")
          .select("total, paid_amount, due_date")
          .eq("business_id", bid)
          .eq("is_credit", true)
          .neq("status", "cancelled"),
      ]);

      const components: ScoreComponent[] = [];

      // 1) Liquidez: flujo de caja neto de los últimos 30 días.
      const tx = txRes.data ?? [];
      if (tx.length > 0) {
        const income = tx
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + Number(t.amount), 0);
        const expense = tx
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + Number(t.amount), 0);
        const net = income - expense;
        const ratio = income > 0 ? net / income : net < 0 ? -1 : 0;
        const points = scoreFromRatio(ratio, 0.15, -0.1);
        components.push({
          key: "liquidez",
          label: "Liquidez",
          points,
          detail:
            net >= 0
              ? `Flujo neto positivo en los últimos 30 días`
              : `Flujo neto negativo en los últimos 30 días`,
          status: statusFromPoints(points),
        });
      }

      // 2) Margen: sobre ventas del mes actual, usando costo real del producto.
      const products = productsRes.data ?? [];
      const costByProduct = new Map<string, number>();
      // No tenemos product_id en products.select porque no se pidió -- lo
      // recalculamos abajo con una consulta separada solo si hay ventas.
      const salesThisMonth = (salesRes.data ?? []).filter((s) => s.sale_date >= startOfThisMonth);
      if (salesThisMonth.length > 0) {
        const productIds = new Set<string>();
        salesThisMonth.forEach((s) => {
          (s.items as Array<{ product_id?: string }> | null)?.forEach((it) => {
            if (it.product_id) productIds.add(it.product_id);
          });
        });
        let marginPoints: number | null = null;
        let marginDetail = "";
        if (productIds.size > 0) {
          const { data: costRows } = await supabase
            .from("products")
            .select("id, cost")
            .eq("business_id", bid)
            .in("id", Array.from(productIds));
          (costRows ?? []).forEach((r) => costByProduct.set(r.id, Number(r.cost)));

          let revenue = 0;
          let cost = 0;
          salesThisMonth.forEach((s) => {
            (s.items as Array<{ product_id?: string; qty: number; price: number }> | null)?.forEach(
              (it) => {
                const lineRevenue = Number(it.price) * Number(it.qty);
                revenue += lineRevenue;
                const unitCost = it.product_id ? (costByProduct.get(it.product_id) ?? 0) : 0;
                cost += unitCost * Number(it.qty);
              },
            );
          });
          if (revenue > 0) {
            const marginRatio = (revenue - cost) / revenue;
            marginPoints = scoreFromRatio(marginRatio, 0.35, 0.1);
            marginDetail = `Margen bruto de ${(marginRatio * 100).toFixed(0)}% este mes`;
          }
        }
        if (marginPoints !== null) {
          components.push({
            key: "margen",
            label: "Margen",
            points: marginPoints,
            detail: marginDetail,
            status: statusFromPoints(marginPoints),
          });
        }
      }

      // 3) Cobranza: % de cuentas por cobrar vencidas sobre el total pendiente.
      const creditSales = creditSalesRes.data ?? [];
      const pending = creditSales.filter((s) => Number(s.paid_amount) < Number(s.total));
      if (pending.length > 0) {
        const totalPending = pending.reduce(
          (s, r) => s + (Number(r.total) - Number(r.paid_amount)),
          0,
        );
        const overdue = pending.filter((r) => r.due_date && r.due_date < todayIso);
        const overdueAmount = overdue.reduce(
          (s, r) => s + (Number(r.total) - Number(r.paid_amount)),
          0,
        );
        const ratio = totalPending > 0 ? overdueAmount / totalPending : 0;
        const points = scoreFromRatio(ratio, 0.1, 0.5);
        components.push({
          key: "cobranza",
          label: "Cobranza",
          points,
          detail:
            overdue.length > 0
              ? `${overdue.length} cuenta(s) por cobrar vencida(s)`
              : "Sin cuentas por cobrar vencidas",
          status: statusFromPoints(points),
        });
      }

      // 4) Inventario: % de productos en stock crítico (<= umbral bajo).
      if (products.length > 0) {
        const critical = products.filter((p) => Number(p.stock) <= Number(p.low_stock_threshold));
        const ratio = critical.length / products.length;
        const points = scoreFromRatio(ratio, 0.05, 0.4);
        components.push({
          key: "inventario",
          label: "Inventario",
          points,
          detail:
            critical.length > 0
              ? `${critical.length} de ${products.length} producto(s) con stock crítico`
              : "Stock saludable en todos los productos",
          status: statusFromPoints(points),
        });
      }

      // 5) Crecimiento: ventas de este mes vs mes anterior.
      const totalThisMonth = salesThisMonth.reduce((s, r) => s + Number(r.total), 0);
      const totalLastMonth = (salesRes.data ?? [])
        .filter((s) => s.sale_date >= startOfLastMonth && s.sale_date < startOfThisMonth)
        .reduce((s, r) => s + Number(r.total), 0);
      if (totalLastMonth > 0) {
        const growth = (totalThisMonth - totalLastMonth) / totalLastMonth;
        const points = scoreFromRatio(growth, 0.1, -0.2);
        components.push({
          key: "crecimiento",
          label: "Crecimiento",
          points,
          detail: `Ventas ${growth >= 0 ? "+" : ""}${(growth * 100).toFixed(0)}% vs. mes anterior`,
          status: statusFromPoints(points),
        });
      }

      if (components.length === 0) {
        return { total: null, components: [] };
      }

      const total = Math.round(
        (components.reduce((s, c) => s + c.points, 0) / (components.length * 20)) * 100,
      );

      return { total, components };
    },
  });
}
