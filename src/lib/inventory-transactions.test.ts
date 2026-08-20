import { describe, expect, it } from "vitest";
import { validateInventoryAdjustment } from "./inventory-transactions";

describe("validateInventoryAdjustment", () => {
  it("normalizes valid transaction metadata", () => {
    expect(
      validateInventoryAdjustment({
        productId: " product-1 ",
        delta: 5,
        reason: " recepción ",
        sourceType: " purchase_receipt ",
        sourceId: " receipt-1 ",
      }),
    ).toEqual({
      productId: "product-1",
      delta: 5,
      reason: "recepción",
      sourceType: "purchase_receipt",
      sourceId: "receipt-1",
    });
  });

  it("rejects zero and fractional changes", () => {
    expect(() => validateInventoryAdjustment({ productId: "p", delta: 0, reason: "x", sourceType: "x" })).toThrow();
    expect(() => validateInventoryAdjustment({ productId: "p", delta: 1.5, reason: "x", sourceType: "x" })).toThrow();
  });

  it("requires an explicit reason and source", () => {
    expect(() => validateInventoryAdjustment({ productId: "p", delta: 1, reason: " ", sourceType: "x" })).toThrow();
    expect(() => validateInventoryAdjustment({ productId: "p", delta: 1, reason: "x", sourceType: " " })).toThrow();
  });
});
