export type GrossMarginResult = {
  revenue: number;
  cost: number;
  marginRatio: number;
};

/**
 * Calculates gross margin only when every sold line has a valid quantity,
 * selling price, product reference, and non-negative acquisition cost.
 * Sale item JSON is treated as untrusted input; missing costs are never zero.
 */
export function calculateGrossMargin(
  sales: readonly { items: unknown }[],
  costByProduct: ReadonlyMap<string, number>,
): GrossMarginResult | null {
  let revenue = 0;
  let cost = 0;

  for (const sale of sales) {
    if (!Array.isArray(sale.items) || sale.items.length === 0) return null;
    for (const rawItem of sale.items) {
      if (!rawItem || typeof rawItem !== "object") return null;
      const item = rawItem as Record<string, unknown>;
      const productId = typeof item.product_id === "string" ? item.product_id.trim() : "";
      if (item.qty === null || item.qty === undefined || item.qty === "" || item.price === null || item.price === undefined || item.price === "") return null;
      const quantity = Number(item.qty);
      const price = Number(item.price);
      if (!productId || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) {
        return null;
      }
      const unitCost = costByProduct.get(productId);
      if (unitCost === undefined || !Number.isFinite(unitCost) || unitCost < 0) return null;
      revenue += price * quantity;
      cost += unitCost * quantity;
    }
  }

  if (revenue <= 0) return null;
  return { revenue, cost, marginRatio: (revenue - cost) / revenue };
}
