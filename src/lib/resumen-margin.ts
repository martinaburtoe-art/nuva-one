export type ResumenSaleItem = {
  product_id?: string | null;
  qty: number | string;
  price: number | string;
};

export type ResumenSaleForMargin = {
  items: ResumenSaleItem[] | null;
};

export type GrossMarginResult = {
  revenue: number;
  cost: number;
  marginRatio: number;
};

/**
 * Calculates gross margin only when every sold line has a valid quantity,
 * selling price, product reference, and non-negative acquisition cost.
 * Missing costs are unknown, never zero.
 */
export function calculateGrossMargin(
  sales: readonly ResumenSaleForMargin[],
  costByProduct: ReadonlyMap<string, number>,
): GrossMarginResult | null {
  let revenue = 0;
  let cost = 0;

  for (const sale of sales) {
    if (!Array.isArray(sale.items) || sale.items.length === 0) return null;
    for (const item of sale.items) {
      const quantity = Number(item.qty);
      const price = Number(item.price);
      if (!item.product_id || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) {
        return null;
      }
      const unitCost = costByProduct.get(item.product_id);
      if (unitCost === undefined || !Number.isFinite(unitCost) || unitCost < 0) return null;
      revenue += price * quantity;
      cost += unitCost * quantity;
    }
  }

  if (revenue <= 0) return null;
  return { revenue, cost, marginRatio: (revenue - cost) / revenue };
}
