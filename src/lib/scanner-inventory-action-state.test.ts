import { describe, expect, it } from "vitest";
import { validateScannerInventoryAction } from "./scanner-inventory-action-state";

describe("validateScannerInventoryAction", () => {
  const base = { operation: "entry" as const, quantity: 2, reason: "Recepción", currentStock: 5 };

  it("normalizes the reason", () => {
    expect(validateScannerInventoryAction({ ...base, reason: "  Recepción  " }).reason).toBe(
      "Recepción",
    );
  });

  it("blocks an exit above available stock", () => {
    expect(() =>
      validateScannerInventoryAction({ ...base, operation: "exit", quantity: 6 }),
    ).toThrow("Stock insuficiente");
  });

  it("blocks a count that produces no adjustment", () => {
    expect(() =>
      validateScannerInventoryAction({ ...base, operation: "count", quantity: 5 }),
    ).toThrow("no hay ajuste");
  });

  it("requires a positive integer quantity", () => {
    expect(() => validateScannerInventoryAction({ ...base, quantity: 0 })).toThrow();
    expect(() => validateScannerInventoryAction({ ...base, quantity: 1.5 })).toThrow();
  });
});
