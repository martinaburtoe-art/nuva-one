import { describe, expect, it } from "vitest";
import { canAutopilotExecute, rankAction, simulateBusiness } from "./operating-system";

describe("Nüva operating system", () => {
  it("simulates price and volume changes without mutating inputs", () => {
    const input = { revenue: 1000, variableCosts: 500, fixedCosts: 200, volume: 100, price: 10, priceChangePct: 5 };
    const result = simulateBusiness(input);
    expect(result.revenue).toBeCloseTo(1050);
    expect(result.operatingProfit).toBeCloseTo(350);
    expect(input.price).toBe(10);
  });

  it("never executes automatic actions when approval is required", () => {
    expect(canAutopilotExecute({ mode: "automatic", enabled: true, approvalRequired: true }, "send_message")).toBe(false);
    expect(canAutopilotExecute({ mode: "automatic", enabled: true, approvalRequired: false }, "send_message")).toBe(true);
  });

  it("honors allow/block/impact constraints", () => {
    const policy = {
      mode: "automatic" as const,
      enabled: true,
      approvalRequired: false,
      constraints: { allowedActionTypes: ["create_task"], blockedActionTypes: ["payment"], maxImpact: 50 },
    };
    expect(canAutopilotExecute(policy, "create_task", 40)).toBe(true);
    expect(canAutopilotExecute(policy, "payment", 1)).toBe(false);
    expect(canAutopilotExecute(policy, "create_task", 51)).toBe(false);
  });

  it("ranks critical, evidence-backed actions above low priority actions", () => {
    expect(rankAction("critical", 80, 1)).toBeGreaterThan(rankAction("low", 20, 1));
  });
});
