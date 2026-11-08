export type DashboardMetricRow = {
  amount?: number | string | null;
  stock?: number | string | null;
  price?: number | string | null;
  low_stock_threshold?: number | string | null;
  reorder_point?: number | string | null;
};

type QueryResult<T> = {
  data: T[] | null;
  error: unknown | null;
};

type CountResult = {
  count: number | null;
  error: unknown | null;
};

export type DashboardMetrics = {
  income: number;
  expense: number;
  net: number;
  inventoryValue: number;
  salesCount: number;
  productsCount: number;
  lowStockCount: number;
};

/**
 * Build executive KPIs only when every source query succeeded.
 * Partial Supabase failures must never be presented as genuine zero values.
 */
export function buildDashboardMetrics(input: {
  sales: QueryResult<DashboardMetricRow>;
  expenses: QueryResult<DashboardMetricRow>;
  products: QueryResult<DashboardMetricRow>;
  salesCount: CountResult;
}): DashboardMetrics {
  const failed = [input.sales, input.expenses, input.products, input.salesCount].some(
    (query) => query.error !== null,
  );

  if (failed) {
    throw new Error("No fue posible obtener todos los indicadores. Vuelve a intentarlo.");
  }

  const income = (input.sales.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const expense = (input.expenses.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const inventoryValue = (input.products.data ?? []).reduce(
    (sum, row) => sum + Number(row.stock ?? 0) * Number(row.price ?? 0),
    0,
  );
  const lowStockCount = (input.products.data ?? []).filter((row) => {
    const stock = Number(row.stock ?? 0);
    const threshold = Number(row.low_stock_threshold ?? row.reorder_point ?? 0);
    return threshold > 0 && stock <= threshold;
  }).length;

  return {
    income,
    expense,
    net: income - expense,
    inventoryValue,
    salesCount: input.salesCount.count ?? 0,
    productsCount: input.products.data?.length ?? 0,
    lowStockCount,
  };
}
