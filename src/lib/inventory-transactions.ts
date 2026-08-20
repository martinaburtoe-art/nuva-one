import type { SupabaseClient } from "@supabase/supabase-js";

export type InventoryOperation = "entry" | "exit" | "count" | "receipt" | "adjustment" | "correction" | "transfer";

export type InventoryAdjustmentInput = {
  productId: string;
  delta: number;
  reason: string;
  sourceType: string;
  sourceId?: string;
};

export type InventoryOperationInput = {
  productId: string;
  operation: InventoryOperation;
  quantity: number;
  currentStock?: number;
  reason: string;
  sourceId?: string;
};

export function validateInventoryAdjustment(input: InventoryAdjustmentInput) {
  const productId = input.productId.trim();
  const reason = input.reason.trim();
  const sourceType = input.sourceType.trim();

  if (!productId) throw new Error("Falta identificar el producto.");
  if (!Number.isSafeInteger(input.delta) || input.delta === 0) {
    throw new Error("La variación debe ser un entero distinto de cero.");
  }
  if (!reason) throw new Error("Debes indicar el motivo del movimiento.");
  if (!sourceType) throw new Error("Debes indicar el origen del movimiento.");
  if (input.sourceId !== undefined && !input.sourceId.trim()) {
    throw new Error("El identificador de origen no puede estar vacío.");
  }

  return {
    productId,
    delta: input.delta,
    reason,
    sourceType,
    sourceId: input.sourceId?.trim() || undefined,
  };
}

/** Converts a scanner operation into the atomic stock delta consumed by the DB RPC. */
export function buildInventoryAdjustment(input: InventoryOperationInput): InventoryAdjustmentInput {
  const quantity = input.quantity;
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error("La cantidad debe ser un entero mayor que cero.");
  }

  const currentStock = input.currentStock ?? 0;
  if (!Number.isSafeInteger(currentStock) || currentStock < 0) {
    throw new Error("El stock actual no es válido.");
  }

  let delta: number;
  switch (input.operation) {
    case "entry":
    case "receipt":
      delta = quantity;
      break;
    case "exit":
      if (quantity > currentStock) throw new Error("Stock insuficiente para realizar la salida.");
      delta = -quantity;
      break;
    case "count":
      delta = quantity - currentStock;
      if (delta === 0) throw new Error("El conteo coincide con el stock actual; no hay ajuste que registrar.");
      break;
    case "adjustment":
    case "correction":
    case "transfer":
      throw new Error("Esta operación requiere una variación explícita y no una cantidad absoluta.");
    default:
      throw new Error("Operación de inventario no soportada.");
  }

  return {
    productId: input.productId,
    delta,
    reason: input.reason,
    sourceType: `scanner_${input.operation}`,
    sourceId: input.sourceId,
  };
}

/**
 * Single entry point for operational stock changes.
 * The database RPC remains responsible for the atomic stock update,
 * tenant authorization and movement/audit creation.
 */
export async function adjustInventoryStock(
  client: SupabaseClient,
  input: InventoryAdjustmentInput,
) {
  const normalized = validateInventoryAdjustment(input);
  const { data, error } = await (client as any).rpc("adjust_product_stock", {
    p_product_id: normalized.productId,
    p_delta: normalized.delta,
    p_reason: normalized.reason,
    p_source_type: normalized.sourceType,
    ...(normalized.sourceId ? { p_source_id: normalized.sourceId } : {}),
  });

  if (error) throw error;
  return data;
}

export async function executeInventoryOperation(
  client: SupabaseClient,
  input: InventoryOperationInput,
) {
  return adjustInventoryStock(client, buildInventoryAdjustment(input));
}
