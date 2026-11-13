export type GrossMarginResult = {
  revenue: number;
  cost: number;
  marginRatio: number;
};

/**
 * Calculates historical gross margin only from a cost snapshot stored on each
 * sale line at the time of sale. Current product cost is NOT a valid substitute:
 * supplier price changes must not rewrite historical profitability.
 * Missing snapshots or incomplete lines make the whole result unavailable.
 */
export function calculateGrossMargin(
  sales: readonly { items: unknown }[],
): GrossMarginResult | null {
  let revenue = 0;
  let cost = 0;

  for (const sale of sales) {
    if (!Array.isArray(sale.items) || sale.items.length === 0) return null;
    for (const rawItem of sale.items) {
      if (!rawItem || typeof rawItem !== "object") return null;
      const item = rawItem as Record<string, unknown>;
      const productId = typeof item.product_id === "string" ? item.product_id.trim() : "";
      const quantityRaw = item.qty;
      const priceRaw = item.price;
      const costRaw = item.unit_cost_snapshot;
      if (!productId || quantityRaw === null || quantityRaw === undefined || quantityRaw === ""
        || priceRaw === null || priceRaw === undefined || priceRaw === ""
        || costRaw === null || costRaw === undefined || costRaw === "") return null;

      const quantity = Number(quantityRaw);
      const price = Number(priceRaw);
      const unitCost = Number(costRaw);
      if (!Number.isFinite(quantity) || quantity <= 0
        || !Number.isFinite(price) || price < 0
        || !Number.isFinite(unitCost) || unitCost < 0) return null;

      revenue += price * quantity;
      cost += unitCost * quantity;
    }
  }

  if (revenue <= 0) return null;
  return { revenue, cost, marginRatio: (revenue - cost) / revenue };
}
