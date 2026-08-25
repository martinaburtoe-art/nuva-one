import { describe, expect, it } from "vitest";
import { buildCommerceIntelligence } from "./nuva-commerce-intelligence";

describe("commerce intelligence", () => {
  it("connects cash, inventory and margin risks", () => {
    const result = buildCommerceIntelligence({
      revenue: 10000,
      cashAvailable: -500,
      inventoryValue: 15000,
      stockoutRisk: 90,
      grossMargin: 10,
    });
    expect(result.signals.map((signal) => signal.id)).toEqual([
      "cash-negative",
      "stockout-risk",
      "margin-low",
    ]);
    expect(result.warnings).toHaveLength(1);
  });

  it("does not create false risk signals for healthy values", () => {
    const result = buildCommerceIntelligence({
      revenue: 10000,
      cashAvailable: 5000,
      inventoryValue: 4000,
      stockoutRisk: 20,
      grossMargin: 40,
    });
    expect(result.signals).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});
