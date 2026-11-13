export type StockThresholdProduct = {
  stock?: unknown;
  low_stock_threshold?: unknown;
  reorder_point?: unknown;
};

/** Prefer the explicit low-stock threshold; fall back only when it is nullish. */
export function getEffectiveStockThreshold(product: StockThresholdProduct): number | null {
  const raw = product.low_stock_threshold ?? product.reorder_point;
  if (raw === null || raw === undefined || raw === "") return null;
  const threshold = Number(raw);
  return Number.isFinite(threshold) && threshold > 0 ? threshold : null;
}

export function isProductLowStock(product: StockThresholdProduct): boolean {
  const threshold = getEffectiveStockThreshold(product);
  const stock = Number(product.stock ?? 0);
  return threshold !== null && Number.isFinite(stock) && stock <= threshold;
}
