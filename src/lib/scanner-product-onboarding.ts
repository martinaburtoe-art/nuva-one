import type { SupabaseClient } from "@supabase/supabase-js";

export type ScannerProductOnboardingInput = {
  businessId: string;
  name: string;
  code: string;
  codeType: string;
  sku?: string;
  category?: string;
  cost?: number;
  price?: number;
  initialStock?: number;
  lowStockThreshold?: number;
};

export type ScannerProductOnboardingResult = {
  product_id: string;
  sku: string;
  code: string;
  stock_before: number;
  stock_after: number;
};

export async function createProductFromScanner(
  client: SupabaseClient,
  input: ScannerProductOnboardingInput,
) {
  const { data, error } = await client.rpc("create_product_from_scanner", {
    p_business_id: input.businessId,
    p_name: input.name.trim(),
    p_code: input.code.trim(),
    p_code_type: input.codeType,
    p_sku: input.sku?.trim() || null,
    p_category: input.category?.trim() || null,
    p_cost: input.cost ?? 0,
    p_price: input.price ?? 0,
    p_initial_stock: input.initialStock ?? 0,
    p_low_stock_threshold: input.lowStockThreshold ?? 5,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.product_id) throw new Error("La creación del producto no devolvió un producto válido.");
  return row as ScannerProductOnboardingResult;
}
