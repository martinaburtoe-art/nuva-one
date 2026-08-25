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

  it("normalizes reconciliation status case and caps the controls penalty", () => {
    const result = buildBusinessHealthIntelligence({
      now: NOW,
      sales: [],
      customers: [],
      products: [],
      activities: [],
      cashFlow: [],
      reconciliation: [
        { status: "RECONCILED" },
        { status: "posted" },
        { status: "pending" },
        { status: "open" },
        { status: "error" },
        { status: "unknown" },
        { status: "unknown" },
        { status: "unknown" },
      ],
    });

    expect(result.reconciliationOpen).toBe(6);
    expect(result.controls).toBe(30);
  });

  it("keeps an empty business neutral instead of inventing positive health", () => {
    const result = buildBusinessHealthIntelligence({
      now: NOW,
      sales: [],
      customers: [],
      products: [],
      activities: [],
      cashFlow: [],
      reconciliation: [],
    });

    expect(result).toMatchObject({
      health: 63,
      momentum: 50,
      liquidity: 50,
      dataReadiness: 0,
      execution: 100,
      controls: 100,
    });
  });
});
