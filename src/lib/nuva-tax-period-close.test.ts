import { describe, expect, it } from "vitest";
import { canEditClosedTaxPeriod, evaluateTaxPeriodClose } from "./nuva-tax-period-close";

describe("tax period close", () => {
  it("blocks close when reconciliation has blockers", () => {
    const result = evaluateTaxPeriodClose({
      period: "2026-08",
      currentState: "review",
      reconciliationStatus: "blocked",
      unresolvedBlockers: 1,
      unresolvedWarnings: 0,
      authorizedBy: "user-1",
    });
    expect(result.canClose).toBe(false);
    expect(result.state).toBe("review");
  });

  it("requires an authorized reviewer and records warnings", () => {
    const result = evaluateTaxPeriodClose({
      period: "2026-08",
      currentState: "open",
      reconciliationStatus: "ready_for_review",
      unresolvedBlockers: 0,
      unresolvedWarnings: 2,
    });
    expect(result.canClose).toBe(false);
    expect(result.blockers[0]).toContain("responsable autorizado");
    expect(result.warnings).toHaveLength(1);
  });

  it("allows close only after a clean authorized review", () => {
    const result = evaluateTaxPeriodClose({
      period: "2026-08",
      currentState: "ready_for_review",
      reconciliationStatus: "ready_for_review",
      unresolvedBlockers: 0,
      unresolvedWarnings: 0,
      authorizedBy: "user-1",
    });
    expect(result.canClose).toBe(true);
    expect(result.state).toBe("closed");
    expect(canEditClosedTaxPeriod("closed")).toBe(false);
  });
});
