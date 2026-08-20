import { describe, expect, it } from "vitest";
import { buildNuvaDecision } from "./nuva-decision-engine";

const input = {
  sales: [{ total: 100000, sale_date: "2026-08-01", due_date: "2026-08-05", paid_amount: 0 }],
  purchases: [{ total: 20000, purchase_date: "2026-08-02" }],
  transactions: [{ amount: 200000, type: "expense", tx_date: "2026-08-10" }],
  stock: [{ name: "SKU-001", sku: "SKU-001", quantity: 0, min_stock: 5, reorder_point: 5 }],
};

describe("Nüva decision contract", () => {
  it("keeps the executive state and action list derived from the same signals", () => {
    const decision = buildNuvaDecision(input);
    expect(decision.topSignal.id).toBe(decision.signals[0].id);
    expect(decision.actions.every((action) => decision.signals.some((signal) => signal.id === action.id))).toBe(true);
    expect(decision.actions.every((action) => action.impact >= 0 && action.impact <= 100)).toBe(true);
  });

  it("never exposes an action without an explicit review or preparation mode", () => {
    const decision = buildNuvaDecision(input);
    expect(decision.actions.every((action) => action.mode === "review" || action.mode === "prepare")).toBe(true);
  });
});
