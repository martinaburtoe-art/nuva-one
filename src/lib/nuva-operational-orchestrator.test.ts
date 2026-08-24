import { describe, expect, it } from "vitest";
import { buildNuvaOperationalResult } from "./nuva-operational-orchestrator";

describe("buildNuvaOperationalResult", () => {
  it("uses one normalized operational snapshot across decision and intelligence", () => {
    const result = buildNuvaOperationalResult({
      sales: [{ total: 100000, status: "completed", paid_amount: 70000, due_date: "2099-01-01" }],
      purchases: [{ total: 30000, status: "paid" }],
      transactions: [
        { amount: 100000, type: "income" },
        { amount: 30000, type: "expense" },
      ],
      products: [
        { stock: 2, min_stock: 3, reorder_point: 3, price: 10000, sku: "A" },
        { stock: 0, min_stock: 1, reorder_point: 1, price: 20000, sku: "B" },
      ],
    });

    expect(result.snapshot.revenue).toBe(100000);
    expect(result.snapshot.cashAvailable).toBe(70000);
    expect(result.snapshot.inventoryValue).toBe(20000);
    expect(result.snapshot.lowStockSkus).toBe(2);
    expect(result.snapshot.stockoutRisk).toBe(50);
    expect(result.intelligence.brainInput.projectedCash30d).toBe(70000);
    expect(result.decision.actions.length).toBeGreaterThanOrEqual(0);
  });
});
