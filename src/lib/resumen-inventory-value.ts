export type InventoryValuationInput = {
  stock: number | string | null;
  cost: number | string | null;
};

/**
 * Values on-hand inventory at acquisition cost, matching the Inventory module.
 * Sales price is intentionally excluded: it represents potential retail value,
 * not the carrying value of stock.
 */
export function calculateInventoryValueAtCost(
  products: readonly InventoryValuationInput[],
): number {
  return products.reduce((total, product) => {
    const stock = Number(product.stock ?? 0);
    const cost = Number(product.cost ?? 0);
    if (!Number.isFinite(stock) || !Number.isFinite(cost)) return total;
    return total + stock * cost;
  }, 0);
}
