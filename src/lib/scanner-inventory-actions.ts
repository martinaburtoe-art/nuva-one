import type { SupabaseClient } from "@supabase/supabase-js";
import { type InventoryOperation, executeInventoryOperation } from "./inventory-transactions";

export type ScannerInventoryAction = Extract<
  InventoryOperation,
  "entry" | "exit" | "count" | "receipt"
>;

export type ScannerInventoryActionInput = {
  client: SupabaseClient;
  productId: string;
  operation: ScannerInventoryAction;
  quantity: number;
  currentStock: number;
  reason: string;
  scanCode?: string;
};

/**
 * Single adapter for scanner-originated stock operations.
 * UI components should call this instead of the stock RPC directly.
 */
export async function executeScannerInventoryAction(input: ScannerInventoryActionInput) {
  const scanCode = input.scanCode?.trim();

  return executeInventoryOperation(input.client, {
    productId: input.productId,
    operation: input.operation,
    quantity: input.quantity,
    currentStock: input.currentStock,
    reason: input.reason,
    sourceId: scanCode || undefined,
  });
}
