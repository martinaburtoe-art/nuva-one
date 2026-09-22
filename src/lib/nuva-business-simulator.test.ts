import { describe, expect, it } from "vitest";
import { simulateBusiness } from "./nuva-business-simulator";

describe("simulateBusiness", () => {
  it("projects revenue and profit with a price increase", () => {
    const result = simulateBusiness({ revenue: 1_000_000, variableCost: 500_000, fixedCost: 200_000, priceChangePct: 5, volumeChangePct: 0 });
    expect(result.projectedRevenue).toBe(1_050_000);
    expect(result.projectedProfit).toBe(550_000);
    expect(result.marginPct).toBeCloseTo(52.38, 1);
  });

  it("handles a negative volume scenario", () => {
    const result = simulateBusiness({ revenue: 1_000_000, variableCost: 500_000, fixedCost: 200_000, priceChangePct: 0, volumeChangePct: -20 });
    expect(result.projectedRevenue).toBe(800_000);
    expect(result.projectedProfit).toBe(200_000);
  });
});
