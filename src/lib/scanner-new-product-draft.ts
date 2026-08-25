import { decideUnknownCode } from "./scanner-new-product-policy";

export type NewProductDraftInput = {
  rawCode: string;
  name: string;
  sku?: string;
  category?: string;
  supplier?: string;
  cost?: number | string;
  price?: number | string;
  initialStock?: number | string;
};

export type NewProductDraft = {
  code: string;
  codeKind: "EAN-13" | "EAN-8" | "UPC-A" | "SKU";
  name: string;
  sku?: string;
  category?: string;
  supplier?: string;
  cost: number;
  price: number;
  initialStock: number;
};

function parseNonNegative(value: number | string | undefined, field: string) {
  if (value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0)
    throw new Error(`${field} debe ser un número mayor o igual a cero.`);
  return parsed;
}

export function buildNewProductDraft(input: NewProductDraftInput): NewProductDraft {
  const decision = decideUnknownCode(input.rawCode);
  if (decision.kind === "invalid") throw new Error(decision.message);

  const name = input.name.trim();
  if (!name) throw new Error("El nombre del producto es obligatorio.");

  const sku = input.sku?.trim().toUpperCase() || undefined;
  return {
    code: decision.code,
    codeKind: decision.codeKind,
    name,
    sku,
    category: input.category?.trim() || undefined,
    supplier: input.supplier?.trim() || undefined,
    cost: parseNonNegative(input.cost, "El costo"),
    price: parseNonNegative(input.price, "El precio"),
    initialStock: Math.trunc(parseNonNegative(input.initialStock, "El stock inicial")),
  };
}
