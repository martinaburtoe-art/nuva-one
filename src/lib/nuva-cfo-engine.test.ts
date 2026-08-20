import { describe, expect, it } from "vitest";
import { buildCFOInsights } from "./nuva-cfo-engine";

describe("Nüva CFO engine", () => {
  it("prioritizes liquidity and collection risks", () => {
    const insights = buildCFOInsights({
      revenue: 10000000,
      grossProfit: 1800000,
      operatingExpenses: 2200000,
      cash: 1000000,
      projectedCash30d: -800000,
      receivables: 4000000,
      overdueReceivables: 1800000,
      payables: 3000000,
      inventoryValue: 7000000,
      monthlyInventoryCost: 1000000,
    });

    expect(insights[0].severity).toBe("critical");
    expect(insights.some((item) => item.id === "collections-risk")).toBe(true);
    expect(insights.some((item) => item.id === "operating-loss")).toBe(true);
  });

  it("returns no warning when the business has strong fundamentals", () => {
    const insights = buildCFOInsights({
      revenue: 20000000,
      grossProfit: 9000000,
      operatingExpenses: 3000000,
      cash: 12000000,
      projectedCash30d: 10000000,
      receivables: 4000000,
      overdueReceivables: 200000,
      payables: 2000000,
      inventoryValue: 3000000,
      monthlyInventoryCost: 1500000,
    });

    expect(insights).toHaveLength(0);
  });
});
