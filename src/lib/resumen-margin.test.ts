import { describe, expect, it } from "vitest";
import { calculateGrossMargin } from "./resumen-margin";

describe("calculateGrossMargin", () => {
  it("calculates margin from complete, real acquisition costs", () => {
    const result = calculateGrossMargin([
      { items: [
        { product_id: "p1", qty: 2, price: 1000 },
        { product_id: "p2", qty: 1, price: 500 },
      ] },
    ], new Map([["p1", 600], ["p2", 200]]));
    expect(result).toEqual({ revenue: 2500, cost: 1400, marginRatio: 0.44 });
  });

  it("returns no margin when any sold product has no known cost", () => {
    expect(calculateGrossMargin([
      { items: [{ product_id: "p1", qty: 1, price: 1000 }] },
    ], new Map())).toBeNull();
  });

  it("returns no margin for incomplete or invalid sale lines", () => {
    const costs = new Map([["p1", 500]]);
    expect(calculateGrossMargin([{ items: null }], costs)).toBeNull();
    expect(calculateGrossMargin([{ items: [] }], costs)).toBeNull();
    expect(calculateGrossMargin([{ items: [{ product_id: "p1", qty: 0, price: 1000 }] }], costs)).toBeNull();
    expect(calculateGrossMargin([{ items: [{ product_id: "p1", qty: 1, price: -1 }] }], costs)).toBeNull();
    expect(calculateGrossMargin([{ items: [{ qty: 1, price: 1000 }] }], costs)).toBeNull();
  });

  it("accepts a genuine zero acquisition cost without inventing a cost", () => {
    expect(calculateGrossMargin([
      { items: [{ product_id: "free", qty: 1, price: 1000 }] },
    ], new Map([["free", 0]])).marginRatio).toBe(1);
  });

  it("rejects negative acquisition costs", () => {
    expect(calculateGrossMargin([
      { items: [{ product_id: "p1", qty: 1, price: 1000 }] },
    ], new Map([["p1", -100]])).toBeNull();
  });
});
