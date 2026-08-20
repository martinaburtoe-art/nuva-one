import { describe, expect, it } from "vitest";
import { buildBusinessBrain } from "./nuva-business-brain";

describe("Nüva Business Brain", () => {
  it("prioritizes critical liquidity risk", () => {
    const result = buildBusinessBrain({
      financialHealthScore: 80,
      projectedCash30d: -500000,
      overdueReceivables: 1200000,
      taxMismatchAmount: 800000,
      lowStockSkus: 2,
      complianceReadiness: 85,
    });
    expect(result.topPriorities[0].id).toBe("cash-risk");
    expect(result.status).toBe("stable");
  });

  it("surfaces compliance and inventory when financials are healthy", () => {
    const result = buildBusinessBrain({
      financialHealthScore: 90,
      projectedCash30d: 5000000,
      overdueReceivables: 0,
      taxMismatchAmount: 0,
      lowStockSkus: 8,
      complianceReadiness: 30,
    });
    expect(result.signals.map((s) => s.id)).toContain("compliance");
    expect(result.signals.map((s) => s.id)).toContain("stock");
  });
});
