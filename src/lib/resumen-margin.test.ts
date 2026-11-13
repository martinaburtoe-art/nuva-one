import { describe, expect, it } from "vitest";
import { calculateGrossMargin } from "./resumen-margin";

describe("calculateGrossMargin", () => {
  it("calculates margin from sale-time cost snapshots on every line", () => {
    const result = calculateGrossMargin([
      { items: [
        { product_id: "p1", qty: 2, price: 1000, unit_cost_snapshot: 600 },
        { product_id: "p2", qty: 1, price: 500, unit_cost_snapshot: 200 },
      ] },
    ]);
    expect(result).toEqual({ revenue: 2500, cost: 1400, marginRatio: 0.44 });
  });

  it("does not substitute current product cost when a sale has no snapshot", () => {
    expect(calculateGrossMargin([
      { items: [{ product_id: "p1", qty: 1, price: 1000 }] },
    ])).toBeNull();
  });

  it("returns no margin when any line has a missing or invalid cost snapshot", () => {
    expect(calculateGrossMargin([{ items: [{ product_id: "p1", qty: 1, price: 1000, unit_cost_snapshot: null }] }])).toBeNull();
    expect(calculateGrossMargin([{ items: [{ product_id: "p1", qty: 1, price: 1000, unit_cost_snapshot: -1 }] }])).toBeNull();
    expect(calculateGrossMargin([{ items: [{ product_id: "p1", qty: 1, price: 1000, unit_cost_snapshot: "invalid" }] }])).toBeNull();
  });

  it("returns no margin for incomplete or invalid sale lines", () => {
    expect(calculateGrossMargin([{ items: null }])).toBeNull();
    expect(calculateGrossMargin([{ items: [] }])).toBeNull();
    expect(calculateGrossMargin([{ items: [{ product_id: "p1", qty: 0, price: 1000, unit_cost_snapshot: 500 }] }])).toBeNull();
    expect(calculateGrossMargin([{ items: [{ product_id: "p1", qty: 1, price: -1, unit_cost_snapshot: 500 }] }])).toBeNull();
    expect(calculateGrossMargin([{ items: [{ qty: 1, price: 1000, unit_cost_snapshot: 500 }] }])).toBeNull();
    expect(calculateGrossMargin([{ items: ["malformed-json"] }])).toBeNull();
    expect(calculateGrossMargin([{ items: [{ product_id: "p1", qty: null, price: 1000, unit_cost_snapshot: 500 }] }])).toBeNull();
    expect(calculateGrossMargin([{ items: [{ product_id: "p1", qty: 1, price: null, unit_cost_snapshot: 500 }] }])).toBeNull();
  });

  it("accepts a genuine zero acquisition-cost snapshot", () => {
    const result = calculateGrossMargin([
      { items: [{ product_id: "free", qty: 1, price: 1000, unit_cost_snapshot: 0 }] },
    ]);
    expect(result).not.toBeNull();
    expect(result?.marginRatio).toBe(1);
  });
});
