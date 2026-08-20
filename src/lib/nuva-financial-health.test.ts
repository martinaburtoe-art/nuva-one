import { describe, expect, it } from "vitest";
import { buildFinancialHealth } from "./nuva-financial-health";

describe("Nüva financial health", () => {
  it("detects liquidity and collections risk", () => {
    const result = buildFinancialHealth({
      cash: 1000000,
      projectedCash30d: -500000,
      receivables: 2000000,
      overdueReceivables: 1500000,
      payables: 2500000,
      monthlyRevenue: 5000000,
      monthlyGrossProfit: 1500000,
      monthlyOperatingExpenses: 1200000,
      inventoryValue: 4000000,
      inventoryMonthlyCost: 1000000,
    });

    expect(result.level).toBe("critical");
    expect(result.score).toBeLessThan(55);
    expect(result.priorities.length).toBeGreaterThan(0);
  });

  it("returns a healthy profile when the business has strong fundamentals", () => {
    const result = buildFinancialHealth({
      cash: 10000000,
      projectedCash30d: 9000000,
      receivables: 3000000,
      overdueReceivables: 100000,
      payables: 1500000,
      monthlyRevenue: 10000000,
      monthlyGrossProfit: 5000000,
      monthlyOperatingExpenses: 1500000,
      inventoryValue: 5000000,
      inventoryMonthlyCost: 1000000,
    });

    expect(result.level).toBe("healthy");
    expect(result.score).toBeGreaterThanOrEqual(75);
  });
});
