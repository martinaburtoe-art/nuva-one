import { supabase } from "@/integrations/supabase/client";

export type ProductResolverStatus =
  | "FOUND"
  | "NOT_FOUND"
  | "DUPLICATE"
  | "INVALID"
  | "UNAUTHORIZED";

export type ResolvedProduct = {
  product_id: string;
  business_id: string;
  name: string | null;
  sku: string | null;
  barcode: string | null;
  code_type: string | null;
  stock: number | null;
  price: number | null;
  cost: number | null;
};

export type ProductResolution = {
  status: ProductResolverStatus;
  input: string;
  products: ResolvedProduct[];
  product?: ResolvedProduct;
};

export function normalizeProductCode(value: string) {
  return value.trim().replace(/\s+/g, "");
}

/**
 * Single tenant-safe product resolver used by scanner, POS, inventory and code registry.
 * Tenant identity is derived by Postgres/RLS; business_id is deliberately not accepted.
 */
export async function resolveProductCode(value: string): Promise<ProductResolution> {
  const input = normalizeProductCode(value);
  if (!input) return { status: "INVALID", input, products: [] };

  const { data, error } = await (supabase as any).rpc("lookup_product_by_code", {
    p_code: input,
  });

  if (error) {
    const message = String(error.message ?? "").toLowerCase();
    if (
      error.code === "42501" ||
      message.includes("permission") ||
      message.includes("not authorized")
    ) {
      return { status: "UNAUTHORIZED", input, products: [] };
    }
    throw error;
  }

  const products = (Array.isArray(data) ? data : data ? [data] : []) as ResolvedProduct[];
  if (products.length === 0) return { status: "NOT_FOUND", input, products: [] };
  if (products.length > 1) return { status: "DUPLICATE", input, products };
  return { status: "FOUND", input, products, product: products[0] };
}
