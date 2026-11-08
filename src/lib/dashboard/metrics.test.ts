import { describe, expect, it } from "vitest";
import { buildDashboardMetrics } from "./metrics";

const empty = { data: [], error: null };

describe("buildDashboardMetrics", () => {
  it("calculates financial, inventory and operational KPIs", () => {
    const result = buildDashboardMetrics({
      sales: { data: [{ amount: "125000" }, { amount: 25000 }], error: null },
      expenses: { data: [{ amount: 40000 }], error: null },
      products: {
        data: [
          { stock: 2, price: 10000, low_stock_threshold: 3 },
          { stock: 8, price: 5000, reorder_point: 4 },
        ],
        error: null,
      },
      salesCount: { count: 7, error: null },
    });

    expect(result).toEqual({
      income: 150000,
      expense: 40000,
      net: 110000,
      inventoryValue: 60000,
      salesCount: 7,
      productsCount: 2,
      lowStockCount: 1,
    });
  });

  it("does not turn a failed source query into misleading zero KPIs", () => {
    expect(() =>
      buildDashboardMetrics({
        sales: { ...empty, error: new Error("permission denied") },
        expenses: empty,
        products: empty,
        salesCount: { count: 0, error: null },
      }),
    ).toThrow("No fue posible obtener todos los indicadores");
  });

  it("supports empty but successfully loaded businesses", () => {
    expect(
      buildDashboardMetrics({
        sales: empty,
        expenses: empty,
        products: empty,
        salesCount: { count: null, error: null },
      }),
    ).toMatchObject({
      income: 0,
      expense: 0,
      net: 0,
      inventoryValue: 0,
      salesCount: 0,
      productsCount: 0,
      lowStockCount: 0,
    });
  });
});
