export type StockThresholdProduct = {
  stock?: unknown;
  low_stock_threshold?: unknown;
  reorder_point?: unknown;
};

/**
 * Uses the configured low-stock threshold first, then reorder point.
 * A threshold must be finite and positive; zero/invalid values do not
 * generate false low-stock alerts.
 */
export function getEffectiveStockThreshold(product: StockThresholdProduct): number | null {
  const rawThreshold = product.low_stock_threshold ?? product.reorder_point ?? 0;
  const threshold = Number(rawThreshold);
  return Number.isFinite(threshold) && threshold > 0 ? threshold : null;
}

export function isProductLowStock(product: StockThresholdProduct): boolean {
  const threshold = getEffectiveStockThreshold(product);
  return threshold !== null && Number(product.stock ?? 0) <= threshold;
}
