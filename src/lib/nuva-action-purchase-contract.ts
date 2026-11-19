export type PurchaseActionLine = {
  product_id: string;
  quantity: number;
  unit_cost: number;
};

export type PurchaseActionPayload = {
  supplier_id: string;
  items: PurchaseActionLine[];
};

export type PurchaseActionPayloadResult =
  | { ok: true; value: PurchaseActionPayload }
  | { ok: false; reason: string };

/**
 * A recommendation is not a purchase order. Only an explicit, fully priced
 * payload can cross the purchase execution boundary.
 */
export function parsePurchaseActionPayload(payload: unknown): PurchaseActionPayloadResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, reason: "Faltan los datos de la compra." };
  }

  const candidate = payload as Record<string, unknown>;
  const supplierId = typeof candidate.supplier_id === "string" ? candidate.supplier_id.trim() : "";
  if (!supplierId) {
    return { ok: false, reason: "Selecciona un proveedor real antes de ejecutar la compra." };
  }

  if (!Array.isArray(candidate.items) || candidate.items.length === 0) {
    return { ok: false, reason: "Agrega al menos una línea de producto a la compra." };
  }

  const items: PurchaseActionLine[] = [];
  const seenProducts = new Set<string>();

  for (const [index, rawItem] of candidate.items.entries()) {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
      return { ok: false, reason: `La línea ${index + 1} no es válida.` };
    }

    const item = rawItem as Record<string, unknown>;
    const productId = typeof item.product_id === "string" ? item.product_id.trim() : "";
    const quantity = Number(item.quantity);
    const unitCost = Number(item.unit_cost);

    if (!productId) {
      return { ok: false, reason: `Selecciona un producto válido en la línea ${index + 1}.` };
    }
    if (seenProducts.has(productId)) {
      return { ok: false, reason: `El producto de la línea ${index + 1} está duplicado.` };
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { ok: false, reason: `La cantidad de la línea ${index + 1} debe ser mayor que cero.` };
    }
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      return { ok: false, reason: `El costo unitario de la línea ${index + 1} debe ser mayor que cero.` };
    }

    seenProducts.add(productId);
    items.push({ product_id: productId, quantity, unit_cost: unitCost });
  }

  return { ok: true, value: { supplier_id: supplierId, items } };
}
