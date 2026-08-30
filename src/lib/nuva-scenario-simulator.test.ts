import { describe, expect, it } from "vitest";
import { simulateBusinessScenario } from "./nuva-scenario-simulator";

describe("Nüva scenario simulator", () => {
  it("detects a dangerous revenue drop when it turns operating result negative", () => {
    const result = simulateBusinessScenario(
      {
        revenue: 10000000,
        grossMargin: 0.35,
        operatingExpenses: 2500000,
        cash: 1000000,
        inventory: 3000000,
      },
      { revenuePct: -30 },
    );
    expect(result.simulated.revenue).toBe(7000000);
    expect(result.risk).toBe("critical");
  });

  it("marks a scenario critical when simulated cash or operating result is negative", () => {
    const result = simulateBusinessScenario(
      {
        revenue: 5000000,
        grossMargin: 0.2,
        operatingExpenses: 1500000,
        cash: 500000,
        inventory: 2000000,
      },
      { revenuePct: -60, cashAdjustment: -1000000 },
    );
    expect(result.risk).toBe("critical");
  });
});
