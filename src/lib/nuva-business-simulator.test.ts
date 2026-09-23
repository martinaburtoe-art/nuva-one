import { describe, expect, it } from "vitest";
import { simulateBusiness } from "./nuva-intelligence/operating-system";

describe("simulateBusiness", () => {
  it("projects revenue and operating profit with a price increase", () => {
    const result = simulateBusiness({
      revenue: 1_000_000,
      variableCosts: 500_000,
      fixedCosts: 200_000,
      volume: 1_000,
      price: 1_000,
      priceChangePct: 5,
      volumeChangePct: 0,
    });

    expect(result.revenue).toBe(1_050_000);
    expect(result.operatingProfit).toBe(350_000);
    expect(result.marginPct).toBeCloseTo(33.33, 1);
  });

  it("handles a negative volume scenario", () => {
    const result = simulateBusiness({
      revenue: 1_000_000,
      variableCosts: 500_000,
      fixedCosts: 200_000,
      volume: 1_000,
      price: 1_000,
      priceChangePct: 0,
      volumeChangePct: -20,
    });

    expect(result.revenue).toBe(800_000);
    expect(result.operatingProfit).toBe(100_000);
  });
});
