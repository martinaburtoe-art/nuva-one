import { describe, expect, it } from "vitest";
import { buildBusinessHealthIntelligence } from "./nuva-business-health";

const NOW = Date.parse("2026-08-25T12:00:00Z");
const sale = (daysAgo: number, total: number, status = "completed") => ({
  sale_date: new Date(NOW - daysAgo * 86_400_000).toISOString(),
  total,
  status,
});

describe("buildBusinessHealthIntelligence", () => {
  it("ignores drafts, cancellations, future dates and invalid dates", () => {
    const result = buildBusinessHealthIntelligence({
      now: NOW,
      sales: [sale(5, 100_000), sale(40, 50_000), sale(5, 999_999, "draft"), sale(5, 999_999, "cancelled"), sale(-2, 999_999), { sale_date: "invalid", total: 500_000 }],
      customers: [],
      products: [],
      activities: [],
      cashFlow: [],
      reconciliation: [],
    });
    expect(result.current30).toBe(100_000);
    expect(result.previous30).toBe(50_000);
    expect(result.momentum).toBe(100);
  });

  it("uses the weakest domain as headline health instead of arbitrary weights", () => {
    const result = buildBusinessHealthIntelligence({
      now: NOW,
      sales: [sale(5, 100_000), sale(40, 50_000)],
      customers: [{ name: "Cliente", status: "active" }],
      products: [{ name: "Producto", price: 100, cost: 50, stock: 10, low_stock_threshold: 2 }],
      activities: [],
      cashFlow: [{ flow_date: new Date(NOW - 5 * 86_400_000).toISOString(), net_cash: 100 }],
      reconciliation: [],
    });
    expect(result.healthMethod).toBe("bottleneck");
    expect(result.health).toBe(Math.min(result.momentum, result.liquidity, result.dataReadiness, result.execution, result.controls));
  });

  it("normalizes reconciliation status case and exposes pending controls", () => {
    const result = buildBusinessHealthIntelligence({
      now: NOW,
      sales: [],
      customers: [],
      products: [],
      activities: [],
      cashFlow: [],
      reconciliation: [{ status: "RECONCILED" }, { status: "posted" }, { status: "pending" }, { status: "open" }, { status: "error" }, { status: "unknown" }, { status: "unknown" }, { status: "unknown" }],
    });
    expect(result.reconciliationOpen).toBe(6);
    expect(result.controls).toBe(25);
    expect(result.signals.find((signal) => signal.id === "open-reconciliations")?.severity).toBe("HIGH");
  });

  it("creates a critical inventory signal from an exhausted product", () => {
    const result = buildBusinessHealthIntelligence({
      now: NOW,
      sales: [],
      customers: [],
      products: [{ name: "Agotado", stock: 0, low_stock_threshold: 3, price: 100, cost: 40 }],
      activities: [],
      cashFlow: [],
      reconciliation: [],
    });
    const signal = result.signals.find((item) => item.id === "inventory-low-stock");
    expect(signal?.severity).toBe("CRITICAL");
    expect(signal?.confidence).toBeGreaterThanOrEqual(0);
    expect(signal?.confidence).toBeLessThanOrEqual(100);
  });

  it("surfaces negative cash flow as an actionable signal", () => {
    const result = buildBusinessHealthIntelligence({
      now: NOW,
      sales: [],
      customers: [],
      products: [],
      activities: [],
      cashFlow: [{ flow_date: new Date(NOW - 5 * 86_400_000).toISOString(), net_cash: -5000 }],
      reconciliation: [],
    });
    const signal = result.signals.find((item) => item.id === "negative-cash-flow-30d");
    expect(signal?.severity).toBe("HIGH");
    expect(signal?.action).toContain("cuentas por cobrar/pagar");
  });
});
