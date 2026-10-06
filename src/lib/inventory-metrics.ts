export type InventoryMetricInput = {
  stock?: number | null;
  reserved_stock?: number | null;
  blocked_stock?: number | null;
  in_transit_stock?: number | null;
  low_stock_threshold?: number | null;
  reorder_point?: number | null;
  max_stock?: number | null;
};

export type InventoryStatus = "out_of_stock" | "critical" | "reorder" | "healthy";

const nonNegative = (value: number | null | undefined) => Math.max(0, Number(value ?? 0));

export function getAvailableStock(product: InventoryMetricInput) {
  return Math.max(
    0,
    nonNegative(product.stock) -
      nonNegative(product.reserved_stock) -
      nonNegative(product.blocked_stock),
  );
}

export function getProjectedStock(product: InventoryMetricInput) {
  return getAvailableStock(product) + nonNegative(product.in_transit_stock);
}

export function getInventoryStatus(product: InventoryMetricInput): InventoryStatus {
  const available = getAvailableStock(product);
  const minimum = nonNegative(product.low_stock_threshold);
  const reorderPoint = nonNegative(product.reorder_point);

  if (available <= 0) return "out_of_stock";
  if (minimum > 0 && available <= minimum) return "critical";
  if (reorderPoint > 0 && available <= reorderPoint) return "reorder";
  return "healthy";
}

export function getSuggestedReplenishment(product: InventoryMetricInput) {
  const target =
    nonNegative(product.max_stock) ||
    nonNegative(product.reorder_point) ||
    nonNegative(product.low_stock_threshold);
  return Math.max(0, target - getProjectedStock(product));
}

export function getInventoryMetrics(product: InventoryMetricInput) {
  return {
    available: getAvailableStock(product),
    projected: getProjectedStock(product),
    status: getInventoryStatus(product),
    suggestedReplenishment: getSuggestedReplenishment(product),
  };
}

export type SupplyReplenishmentItem = {
  productId?: string;
  name?: string | null;
  sku?: string | null;
  available: number;
  projected: number;
  status: InventoryStatus;
  suggestedReplenishment: number;
  unitCost: number;
  estimatedCost: number;
};

export type SupplyReplenishmentPlan = {
  items: SupplyReplenishmentItem[];
  totalItemsToOrder: number;
  estimatedTotalCost: number;
  outOfStockCount: number;
  criticalCount: number;
  reorderCount: number;
  healthyCount: number;
};

export function calculateSupplyReplenishmentPlan(
  products: (InventoryMetricInput & {
    id?: string;
    name?: string | null;
    sku?: string | null;
    cost?: number | null;
  })[],
): SupplyReplenishmentPlan {
  const items: SupplyReplenishmentItem[] = [];
  let totalItemsToOrder = 0;
  let estimatedTotalCost = 0;
  let outOfStockCount = 0;
  let criticalCount = 0;
  let reorderCount = 0;
  let healthyCount = 0;

  for (const product of products ?? []) {
    const available = getAvailableStock(product);
    const projected = getProjectedStock(product);
    const status = getInventoryStatus(product);
    const suggestedReplenishment = getSuggestedReplenishment(product);
    const unitCost = nonNegative(product.cost);
    const estimatedCost = suggestedReplenishment * unitCost;

    if (status === "out_of_stock") outOfStockCount++;
    else if (status === "critical") criticalCount++;
    else if (status === "reorder") reorderCount++;
    else healthyCount++;

    if (suggestedReplenishment > 0) {
      totalItemsToOrder += suggestedReplenishment;
      estimatedTotalCost += estimatedCost;
    }

    items.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      available,
      projected,
      status,
      suggestedReplenishment,
      unitCost,
      estimatedCost,
    });
  }

  return {
    items,
    totalItemsToOrder,
    estimatedTotalCost,
    outOfStockCount,
    criticalCount,
    reorderCount,
    healthyCount,
  };
}
