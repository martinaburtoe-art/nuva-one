export type PurchaseActionLine = {
  product_id: string;
  quantity: number;
  unit_cost: number;
};

export type PurchaseTaxTreatment = "taxable" | "exempt" | "non_taxable";

export type PurchaseActionPayload = {
  supplier_id: string;
  tax_treatment: PurchaseTaxTreatment;
  vat_rate: 0 | 19;
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

  const taxTreatment = candidate.tax_treatment;
  const vatRate = Number(candidate.vat_rate);
  if (taxTreatment !== "taxable" && taxTreatment !== "exempt" && taxTreatment !== "non_taxable") {
    return { ok: false, reason: "Selecciona el tratamiento tributario indicado en el documento del proveedor." };
  }
  if ((taxTreatment === "taxable" && vatRate !== 19) || (taxTreatment !== "taxable" && vatRate !== 0)) {
    return { ok: false, reason: "La tasa IVA no coincide con el tratamiento tributario seleccionado." };
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
    if (!Number.isSafeInteger(quantity * unitCost)) {
      return { ok: false, reason: `El total de la línea ${index + 1} supera el rango numérico seguro.` };
    }

    seenProducts.add(productId);
    items.push({ product_id: productId, quantity, unit_cost: unitCost });
  }

  return { ok: true, value: { supplier_id: supplierId, tax_treatment: taxTreatment, vat_rate: vatRate as 0 | 19, items } };
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


export type PurchaseExecutionFingerprint = {
  supplier_id: string;
  tax_treatment: PurchaseTaxTreatment;
  vat_rate: 0 | 19;
  total: number;
  items: PurchaseRecordItem[];
};

/**
 * Compare a persisted purchase with the action payload before treating a
 * retry as an idempotent replay. Display names are intentionally ignored;
 * tenant, supplier, tax treatment, quantities and CLP amounts are not.
 */
export function purchaseRecordMatchesAction(
  record: unknown,
  expected: PurchaseExecutionFingerprint,
): boolean {
  if (!record || typeof record !== "object" || Array.isArray(record)) return false;
  const candidate = record as Record<string, unknown>;
  if (
    candidate.supplier_id !== expected.supplier_id ||
    Number(candidate.total) !== expected.total ||
    candidate.tax_treatment !== expected.tax_treatment ||
    Number(candidate.vat_rate) !== expected.vat_rate
  ) return false;

  const normalizeItems = (value: unknown) => {
    if (!Array.isArray(value)) return null;
    const normalized: Array<{ product_id: string; qty: number; unit_cost: number; total: number }> = [];
    for (const rawItem of value) {
      if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) return null;
      const item = rawItem as Record<string, unknown>;
      const productId = typeof item.product_id === "string" ? item.product_id : "";
      const qty = Number(item.qty ?? item.quantity);
      const unitCost = Number(item.unit_cost);
      const lineTotal = Number(item.total);
      if (!productId || !Number.isSafeInteger(qty) || qty <= 0 || !Number.isSafeInteger(unitCost) || unitCost <= 0 || !Number.isSafeInteger(lineTotal) || lineTotal !== qty * unitCost) return null;
      normalized.push({ product_id: productId, qty, unit_cost: unitCost, total: lineTotal });
    }
    return normalized.sort((left, right) => left.product_id.localeCompare(right.product_id));
  };

  const actualItems = normalizeItems(candidate.items);
  const expectedItems = normalizeItems(expected.items);
  return actualItems !== null && expectedItems !== null && JSON.stringify(actualItems) === JSON.stringify(expectedItems);
}


/**
 * A unique-conflict retry may reuse an executed outcome only when it points
 * to the same immutable business mutation. Mutable status and replay flags are
 * deliberately ignored; record identity and purchase amount/lines are not.
 */
export function actionOutcomeMatchesResult(
  evidence: unknown,
  expected: Record<string, unknown>,
): boolean {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return false;
  const actual = evidence as Record<string, unknown>;
  if (
    typeof expected.operation !== "string" ||
    typeof expected.record_id !== "string" ||
    actual.operation !== expected.operation ||
    actual.record_id !== expected.record_id
  ) return false;

  for (const key of ["total", "currency", "line_count"] as const) {
    if (expected[key] !== undefined && actual[key] !== expected[key]) return false;
  }
  return true;
}
