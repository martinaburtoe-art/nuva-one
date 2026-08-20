import { describe, expect, it } from "vitest";
import { buildCfoInsights } from "./nuva-cfo-insights";

describe("Nüva CFO insights", () => {
  it("prioritizes cash and collections risks", () => {
    const insights = buildCfoInsights({
      revenue: 5000000,
      grossProfit: 900000,
      operatingExpenses: 850000,
      cash: 1000000,
      projectedCash30d: -300000,
      receivables: 2000000,
      overdueReceivables: 1000000,
      payables: 1800000,
      inventoryValue: 1500000,
    });

    expect(insights.some((i) => i.id === "liquidity-risk")).toBe(true);
    expect(insights.some((i) => i.id === "collections-risk")).toBe(true);
  });

  it("recognizes a strong margin", () => {
    const insights = buildCfoInsights({
      revenue: 10000000,
      grossProfit: 5000000,
      operatingExpenses: 1500000,
      cash: 8000000,
      projectedCash30d: 7000000,
      receivables: 1000000,
      overdueReceivables: 50000,
      payables: 800000,
      inventoryValue: 2000000,
    });

    expect(insights.some((i) => i.id === "healthy-margin")).toBe(true);
  });
});
