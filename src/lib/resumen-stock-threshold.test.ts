import { describe, expect, it } from "vitest";
import { getEffectiveStockThreshold, isProductLowStock } from "./resumen-stock-threshold";

describe("effective stock threshold", () => {
  it("prefers configured low-stock threshold", () => {
    expect(getEffectiveStockThreshold({ low_stock_threshold: 4, reorder_point: 8 })).toBe(4);
  });
  it("uses reorder point only when low-stock threshold is nullish", () => {
    expect(getEffectiveStockThreshold({ low_stock_threshold: null, reorder_point: 8 })).toBe(8);
    expect(getEffectiveStockThreshold({ reorder_point: 8 })).toBe(8);
  });
  it("rejects zero, negative, non-finite and empty thresholds", () => {
    for (const value of [0, -1, Infinity, "NaN", ""]) {
      expect(getEffectiveStockThreshold({ low_stock_threshold: value })).toBeNull();
    }
  });
  it("flags stock at or below a valid threshold", () => {
    expect(isProductLowStock({ stock: 4, low_stock_threshold: 4 })).toBe(true);
    expect(isProductLowStock({ stock: 5, low_stock_threshold: 4 })).toBe(false);
  });
  it("does not flag non-finite stock or invalid thresholds", () => {
    expect(isProductLowStock({ stock: Infinity, low_stock_threshold: 4 })).toBe(false);
    expect(isProductLowStock({ stock: 0, low_stock_threshold: 0, reorder_point: 8 })).toBe(false);
  });
});
