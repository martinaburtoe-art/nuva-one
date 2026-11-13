import { describe, expect, it } from "vitest";
import { getEffectiveStockThreshold, isProductLowStock } from "./resumen-stock-threshold";

describe("Resumen stock threshold", () => {
  it("prefers low_stock_threshold and falls back to reorder_point only when nullish", () => {
    expect(getEffectiveStockThreshold({ low_stock_threshold: 4, reorder_point: 8 })).toBe(4);
    expect(getEffectiveStockThreshold({ low_stock_threshold: null, reorder_point: 8 })).toBe(8);
    expect(getEffectiveStockThreshold({ low_stock_threshold: undefined, reorder_point: 8 })).toBe(8);
  });

  it("does not treat zero as missing or fall back from an explicit zero", () => {
    expect(getEffectiveStockThreshold({ low_stock_threshold: 0, reorder_point: 8 })).toBeNull();
  });

  it("requires a finite positive threshold", () => {
    expect(getEffectiveStockThreshold({ low_stock_threshold: -1, reorder_point: 8 })).toBeNull();
    expect(getEffectiveStockThreshold({ low_stock_threshold: "invalid", reorder_point: 8 })).toBeNull();
  });

  it("flags stock at or below the effective threshold", () => {
    expect(isProductLowStock({ stock: 4, low_stock_threshold: 4 })).toBe(true);
    expect(isProductLowStock({ stock: 3, low_stock_threshold: null, reorder_point: 4 })).toBe(true);
    expect(isProductLowStock({ stock: 5, low_stock_threshold: 4 })).toBe(false);
    expect(isProductLowStock({ stock: 0, low_stock_threshold: 0, reorder_point: 8 })).toBe(false);
  });
});
