import { describe, expect, it } from "vitest";
import { buildFinanceGuardian } from "./nuva-finance-guardian";

describe("Nüva Finance Guardian", () => {
  const now = new Date("2026-08-20T12:00:00Z");

  it("calculates VAT and overdue balances", () => {
    const result = buildFinanceGuardian({
      sales: [{ total: 119000, tax: 19000, date: "2026-08-10" }],
      purchases: [{ total: 59500, tax: 9500, date: "2026-08-11" }],
      receivables: [{ amount: 300000, dueDate: "2026-08-10" }],
      payables: [{ amount: 100000, dueDate: "2026-08-10" }],
      cash: 500000,
    }, now);

    expect(result.estimatedVat).toBe(9500);
    expect(result.overdueReceivables).toBe(300000);
    expect(result.overduePayables).toBe(100000);
  });

  it("flags a projected 30-day cash deficit", () => {
    const result = buildFinanceGuardian({
      sales: [{ total: 119000, tax: 19000, date: "2026-08-20" }],
      purchases: [],
      receivables: [{ amount: 100000, dueDate: "2026-08-25" }],
      payables: [{ amount: 700000, dueDate: "2026-08-25" }],
      cash: 500000,
    }, now);

    expect(result.projectedCash30d).toBeLessThan(0);
    expect(result.signals.some((signal) => signal.id === "cash-risk-30d")).toBe(true);
  });
});
