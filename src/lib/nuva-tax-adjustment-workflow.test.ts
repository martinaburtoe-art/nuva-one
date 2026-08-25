import { describe, expect, it } from "vitest";
import { transitionTaxAdjustment } from "./nuva-tax-adjustment-workflow";

const base = {
  id: "ADJ-1",
  period: "2026-08",
  reason: "Corrección conciliación",
  entityId: "DTE-1",
  impact: 190,
  requestedBy: "user-1",
  state: "requested" as const,
};

describe("tax adjustment workflow", () => {
  it("requires authorization", () => {
    const result = transitionTaxAdjustment(base, "approved");
    expect(result.allowed).toBe(false);
  });
  it("allows approved -> applied -> revalidated", () => {
    const approved = transitionTaxAdjustment(base, "approved", "reviewer-1");
    expect(approved.nextState).toBe("approved");
    const applied = transitionTaxAdjustment({ ...base, state: "approved" }, "applied", "system");
    expect(applied.allowed).toBe(true);
    const revalidated = transitionTaxAdjustment(
      { ...base, state: "applied" },
      "revalidated",
      "system",
    );
    expect(revalidated.allowed).toBe(true);
  });
  it("rejects invalid transitions", () => {
    const result = transitionTaxAdjustment(
      { ...base, state: "requested" },
      "revalidated",
      "user-1",
    );
    expect(result.allowed).toBe(false);
    expect(result.blockers[0]).toContain("Transición inválida");
  });
});
