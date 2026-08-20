import { describe, expect, it } from "vitest";
import { buildNuvaDecision } from "./nuva-decision-engine";

describe("buildNuvaDecision", () => {
  it("returns critical status and ranked actions from one intelligence source", () => {
    const result = buildNuvaDecision({
      sales: [{ total: 100000, sale_date: "2026-08-01", due_date: "2026-08-05", paid_amount: 0 }],
      purchases: [],
      transactions: [{ amount: 200000, type: "expense", tx_date: "2026-08-10" }],
      stock: [],
      now: new Date("2026-08-20T12:00:00Z"),
    });
    expect(result.status).toBe("critical");
    expect(result.score).toBeGreaterThan(0);
    expect(result.actions[0].id).toBe(result.signals[0].id);
    expect(result.headline).toContain("críticas");
  });

  it("provides a stable decision when no priority signal exists", () => {
    const result = buildNuvaDecision({ sales: [], purchases: [], transactions: [], stock: [] });
    expect(result.status).toBe("stable");
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].id).toBe("business-stable");
  });
});
