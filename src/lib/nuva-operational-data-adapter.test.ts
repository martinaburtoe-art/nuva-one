import { describe, expect, it } from "vitest";
import { buildOperationalIntelligence } from "./nuva-operational-data-adapter";

describe("operational data adapter", () => {
  it("maps real operational domains into the Business Brain contract", () => {
    const result = buildOperationalIntelligence({
      financialHealthScore: 85,
      cashAvailable: 500000,
      projectedCash30d: -250000,
      overdueReceivables: 150000,
      revenue: 1000000,
      inventoryValue: 900000,
      lowStockSkus: 3,
      stockoutRisk: 60,
      grossMargin: 28,
      taxMismatchAmount: 0,
      complianceReadiness: 90,
      dataSources: ["cash", "sales", "inventory", "crm", "tax"],
    });

    expect(result.brainInput.projectedCash30d).toBe(-250000);
    expect(result.brain.signals[0].id).toBe("cash-risk");
    expect(result.signals[0].module).toBe("cashflow");
    expect(result.dataQuality).toBe("high");
  });

  it("does not manufacture missing values and downgrades data quality", () => {
    const result = buildOperationalIntelligence({
      financialHealthScore: Number.NaN,
      cashAvailable: 0,
      projectedCash30d: Number.NaN,
      overdueReceivables: Number.NaN,
      revenue: 0,
      inventoryValue: 0,
      lowStockSkus: Number.NaN,
      stockoutRisk: 0,
      grossMargin: null,
      taxMismatchAmount: Number.NaN,
      complianceReadiness: Number.NaN,
      dataSources: ["cash"],
    });

    expect(result.dataQuality).toBe("low");
    expect(result.brainInput.projectedCash30d).toBe(0);
    expect(
      result.signals.every((signal) => signal.confidence >= 0 && signal.confidence <= 100),
    ).toBe(true);
  });
});
