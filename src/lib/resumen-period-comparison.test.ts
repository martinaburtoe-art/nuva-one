import { describe, expect, it } from "vitest";
import { calculatePercentChange, getLargestExpenseCategory, getPreviousComparableWindow } from "./resumen-period-comparison";

describe("resumen period comparison", () => {
  it("creates an equal-length immediately preceding window", () => {
    expect(getPreviousComparableWindow({ from: "2026-11-01", to: "2026-11-30", defaultFrom: "2026-06-01", today: "2026-11-30" }))
      .toEqual({ from: "2026-10-02", to: "2026-10-31" });
  });

  it("uses the default six-month window when no dates are selected", () => {
    expect(getPreviousComparableWindow({ from: null, to: null, defaultFrom: "2026-06-01", today: "2026-11-30" }))
      .toEqual({ from: "2025-11-30", to: "2026-05-31" });
  });

  it("does not invent a comparison for an end-only all-history filter", () => {
    expect(getPreviousComparableWindow({ from: null, to: "2026-11-30", defaultFrom: "2026-06-01", today: "2026-11-30" })).toBeNull();
  });

  it("returns null when the previous baseline is zero", () => {
    expect(calculatePercentChange(120, 0)).toBeNull();
    expect(calculatePercentChange(120, 100)).toBe(20);
    expect(calculatePercentChange(80, 100)).toBe(-20);
  });

  it("finds the largest expense category and its share", () => {
    expect(getLargestExpenseCategory([
      { type: "expense", category: "Arriendo", amount: 300 },
      { type: "expense", category: "Insumos", amount: 200 },
      { type: "income", category: "Ventas", amount: 5000 },
      { type: "expense", category: null, amount: 100 },
    ])).toEqual({ category: "Arriendo", amount: 300, share: 50 });
  });
});
