import { describe, expect, it } from "vitest";
import { buildNuvaIntelligence } from "./nuva-intelligence";

describe("buildNuvaIntelligence", () => {
  it("flags overdue receivables", () => {
    const signals = buildNuvaIntelligence({
      now: new Date("2026-08-20T12:00:00Z"),
      sales: [{ total: 100000, paid_amount: 0, due_date: "2026-08-01T00:00:00Z" }],
    });
    expect(signals[0].id).toBe("receivables-overdue");
  });


  it("does not mark a date-only deadline tomorrow in Chile as overdue after 21:00 UTC boundary", () => {
    const signals = buildNuvaIntelligence({
      now: new Date("2026-11-19T01:00:00.000Z"),
      sales: [{ total: 100000, paid_amount: 0, due_date: "2026-11-19" }],
    });
    expect(signals.some((signal) => signal.id === "receivables-overdue")).toBe(false);
  });

  it("marks a date-only deadline overdue after the business-local calendar day changes", () => {
    const signals = buildNuvaIntelligence({
      now: new Date("2026-11-19T03:00:00.000Z"),
      sales: [{ total: 100000, paid_amount: 0, due_date: "2026-11-18" }],
    });
    expect(signals.some((signal) => signal.id === "receivables-overdue")).toBe(true);
  });

  it("accepts an explicit business timezone for date-only deadlines", () => {
    const signals = buildNuvaIntelligence({
      now: new Date("2026-11-19T01:00:00.000Z"),
      businessTimeZone: "UTC",
      sales: [{ total: 100000, paid_amount: 0, due_date: "2026-11-19" }],
    });
    expect(signals.some((signal) => signal.id === "receivables-overdue")).toBe(false);
  });

  it("flags low stock", () => {
    const signals = buildNuvaIntelligence({
      stock: [{ sku: "ABC", name: "Producto", quantity: 2, reorder_point: 5 }],
    });
    expect(signals.some((signal) => signal.id === "low-stock")).toBe(true);
  });

  it("flags purchase pressure", () => {
    const signals = buildNuvaIntelligence({
      sales: [{ total: 100000 }],
      purchases: [{ total: 95000 }],
    });
    expect(signals.some((signal) => signal.id === "purchase-pressure")).toBe(true);
  });

  it("returns a stable fallback when no signals exist", () => {
    const signals = buildNuvaIntelligence({});
    expect(signals).toHaveLength(1);
    expect(signals[0].id).toBe("business-stable");
  });
});
