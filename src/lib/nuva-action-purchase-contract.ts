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
    const quantityInput = item.quantity;
    const unitCostInput = item.unit_cost;
    if ((typeof quantityInput !== "number" && typeof quantityInput !== "string") || String(quantityInput).trim() === "") {
      return { ok: false, reason: `La cantidad de la línea ${index + 1} no es válida.` };
    }
    if ((typeof unitCostInput !== "number" && typeof unitCostInput !== "string") || String(unitCostInput).trim() === "") {
      return { ok: false, reason: `El costo unitario de la línea ${index + 1} no es válido.` };
    }
    const quantity = Number(quantityInput);
    const unitCost = Number(unitCostInput);

    if (!productId) {
      return { ok: false, reason: `Selecciona un producto válido en la línea ${index + 1}.` };
    }
    if (seenProducts.has(productId)) {
      return { ok: false, reason: `El producto de la línea ${index + 1} está duplicado.` };
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      return { ok: false, reason: `La cantidad de la línea ${index + 1} debe ser un entero mayor que cero.` };
    }
    if (!Number.isSafeInteger(unitCost) || unitCost <= 0) {
      return { ok: false, reason: `El costo unitario de la línea ${index + 1} debe ser un entero positivo en CLP.` };
    }

    seenProducts.add(productId);
    items.push({ product_id: productId, quantity, unit_cost: unitCost });
  }

  return { ok: true, value: { supplier_id: supplierId, items } };
}

export type PurchaseRecordItem = {
  product_id: string;
  name: string;
  qty: number;
  quantity: number;
  unit_cost: number;
  total: number;
};

/** Match the JSON contract consumed by the purchase stock lifecycle trigger. */
export function buildPurchaseRecordItems(
  items: PurchaseActionLine[],
  productNames: ReadonlyMap<string, string>,
): PurchaseRecordItem[] {
  return items.map((item) => ({
    product_id: item.product_id,
    name: productNames.get(item.product_id) ?? "Producto",
    qty: item.quantity,
    quantity: item.quantity,
    unit_cost: item.unit_cost,
    total: item.quantity * item.unit_cost,
  }));
}
