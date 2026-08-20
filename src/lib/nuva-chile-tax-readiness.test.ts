import { describe, expect, it } from "vitest";
import { assessChileTaxReadiness } from "./nuva-chile-tax-readiness";

describe("Chile tax readiness", () => {
  it("blocks readiness when DTE, RCV or IVA issues remain", () => {
    const result = assessChileTaxReadiness({
      dteAccepted: 90,
      dteRejected: 2,
      dtePending: 1,
      dteMissingXml: 1,
      rcvPurchaseUnreconciled: 2,
      rcvSalesUnreconciled: 0,
      ivaDifference: 50000,
      f29Errors: 1,
      f29Warnings: 0,
      periodLocked: false,
    });
    expect(result.status).toBe("blocked");
    expect(result.blockers.length).toBeGreaterThanOrEqual(5);
  });

  it("marks a clean locked period ready", () => {
    const result = assessChileTaxReadiness({
      dteAccepted: 100,
      dteRejected: 0,
      dtePending: 0,
      dteMissingXml: 0,
      rcvPurchaseUnreconciled: 0,
      rcvSalesUnreconciled: 0,
      ivaDifference: 0,
      f29Errors: 0,
      f29Warnings: 0,
      periodLocked: true,
    });
    expect(result.status).toBe("ready");
    expect(result.score).toBe(100);
  });
});
