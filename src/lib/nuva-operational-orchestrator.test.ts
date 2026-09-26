import { describe, expect, it } from "vitest";
import { buildNuvaOperationalResult } from "./nuva-operational-orchestrator";

describe("buildNuvaOperationalResult", () => {
  it("uses the real low-stock threshold and reorder point fields", () => {
    const result = buildNuvaOperationalResult({ sales: [], purchases: [], transactions: [], products: [{ stock: 2, low_stock_threshold: 5, reorder_point: 8, price: 1000, name: "Producto", sku: "SKU-1" }] });
    expect(result.snapshot.lowStockSkus).toBe(1);
    expect(result.decision.signals.some((signal) => signal.id === "stock")).toBe(true);
  });

  it("does not invent tax or compliance certainty when those datasets are unavailable", () => {
    const result = buildNuvaOperationalResult({ sales: [], purchases: [], transactions: [], products: [] });
    expect(result.intelligence.brainInput.taxMismatchAmount).toBeNull();
    expect(result.intelligence.brainInput.complianceReadiness).toBeNull();
    expect(result.decision.signals.some((signal) => signal.id === "tax-mismatch")).toBe(false);
    expect(result.decision.signals.some((signal) => signal.id === "compliance")).toBe(false);
  });

  it("projects 30 days from the recent transaction run-rate", () => {
    const recent = new Date().toISOString().slice(0, 10);
    const result = buildNuvaOperationalResult({ sales: [], purchases: [], transactions: [{ amount: 100000, type: "income", tx_date: recent }, { amount: 40000, type: "expense", tx_date: recent }], products: [] });
    expect(result.snapshot.cashAvailable).toBe(60000);
    expect(result.snapshot.projectedCash30d).toBe(120000);
  });
});
