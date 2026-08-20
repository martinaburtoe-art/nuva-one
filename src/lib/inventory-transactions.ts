import type { SupabaseClient } from "@supabase/supabase-js";

export type InventoryAdjustmentInput = {
  productId: string;
  delta: number;
  reason: string;
  sourceType: string;
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
