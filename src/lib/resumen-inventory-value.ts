export type InventoryValuationInput = {
  stock: number | string | null;
  cost: number | string | null;
};

/**
 * Values on-hand inventory at acquisition cost, matching the Inventory module.
 * Returns null when any on-hand quantity cannot be valued reliably; a missing
 * acquisition cost must never be silently treated as zero.
 */
export function calculateInventoryValueAtCost(
  products: readonly InventoryValuationInput[],
): number | null {
  let total = 0;
  for (const product of products) {
    if (product.stock === null || product.stock === "") return null;
    const stock = Number(product.stock);
    if (!Number.isFinite(stock) || stock < 0) return null;
    if (stock === 0) continue;
    if (product.cost === null || product.cost === "") return null;
    const cost = Number(product.cost);
    if (!Number.isFinite(cost) || cost < 0) return null;
    total += stock * cost;
  }
  return total;
}
