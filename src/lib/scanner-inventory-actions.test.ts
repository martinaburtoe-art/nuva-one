import { describe, expect, it, vi } from "vitest";
import { executeScannerInventoryAction } from "./scanner-inventory-actions";

vi.mock("./inventory-transactions", () => ({
  executeInventoryOperation: vi.fn(async (_client: unknown, input: unknown) => input),
}));

describe("executeScannerInventoryAction", () => {
  it("routes a scanner entry through the centralized transaction engine", async () => {
    const result = await executeScannerInventoryAction({
      client: {} as never,
      productId: "product-1",
      operation: "entry",
      quantity: 4,
      currentStock: 10,
      reason: "Recepción de mercadería",
      scanCode: "7801234567890",
    });

    expect(result).toEqual({
      productId: "product-1",
      operation: "entry",
      quantity: 4,
      currentStock: 10,
      reason: "Recepción de mercadería",
      sourceId: "7801234567890",
    });
  });

  it("does not create a blank source identifier", async () => {
    const result = await executeScannerInventoryAction({
      client: {} as never,
      productId: "product-1",
      operation: "count",
      quantity: 8,
      currentStock: 10,
      reason: "Conteo físico",
      scanCode: "   ",
    });

    expect(result.sourceId).toBeUndefined();
  });
});
