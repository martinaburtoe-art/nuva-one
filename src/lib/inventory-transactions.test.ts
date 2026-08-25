import { describe, expect, it } from "vitest";
import { buildInventoryAdjustment, validateInventoryAdjustment } from "./inventory-transactions";

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
    expect(() =>
      validateInventoryAdjustment({ productId: "p", delta: 0, reason: "x", sourceType: "x" }),
    ).toThrow();
    expect(() =>
      validateInventoryAdjustment({ productId: "p", delta: 1.5, reason: "x", sourceType: "x" }),
    ).toThrow();
  });

  it("requires an explicit reason and source", () => {
    expect(() =>
      validateInventoryAdjustment({ productId: "p", delta: 1, reason: " ", sourceType: "x" }),
    ).toThrow();
    expect(() =>
      validateInventoryAdjustment({ productId: "p", delta: 1, reason: "x", sourceType: " " }),
    ).toThrow();
  });
});

describe("scanner inventory transactions", () => {
  it("turns an entry into a positive delta", () => {
    expect(
      buildInventoryAdjustment({
        productId: "p1",
        operation: "entry",
        quantity: 5,
        currentStock: 2,
        reason: "Recepción",
      }),
    ).toMatchObject({ delta: 5, sourceType: "scanner_entry" });
  });

  it("turns an exit into a negative delta", () => {
    expect(
      buildInventoryAdjustment({
        productId: "p1",
        operation: "exit",
        quantity: 3,
        currentStock: 8,
        reason: "Venta",
      }),
    ).toMatchObject({ delta: -3, sourceType: "scanner_exit" });
  });

  it("rejects an exit larger than available stock", () => {
    expect(() =>
      buildInventoryAdjustment({
        productId: "p1",
        operation: "exit",
        quantity: 9,
        currentStock: 8,
        reason: "Venta",
      }),
    ).toThrow("Stock insuficiente");
  });

  it("converts a count into the difference from current stock", () => {
    expect(
      buildInventoryAdjustment({
        productId: "p1",
        operation: "count",
        quantity: 12,
        currentStock: 10,
        reason: "Inventario físico",
      }),
    ).toMatchObject({ delta: 2, sourceType: "scanner_count" });
  });

  it("rejects a count with no stock difference", () => {
    expect(() =>
      buildInventoryAdjustment({
        productId: "p1",
        operation: "count",
        quantity: 10,
        currentStock: 10,
        reason: "Inventario físico",
      }),
    ).toThrow("no hay ajuste");
  });
});
