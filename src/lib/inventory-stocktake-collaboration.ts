import { supabase } from "@/integrations/supabase/client";

export type StocktakeCountMode = "unit" | "quantity";

export type StocktakeLine = {
  id: string;
  stocktake_id: string;
  business_id: string;
  product_id: string;
  barcode: string | null;
  product_name: string;
  system_qty: number;
  counted_qty: number;
  difference: number | null;
};

export async function loadStocktakeLines(stocktakeId: string): Promise<StocktakeLine[]> {
  const { data, error } = await supabase
    .from("inventory_stocktake_lines")
    .select("id,stocktake_id,business_id,product_id,barcode,product_name,system_qty,counted_qty,difference")
    .eq("stocktake_id", stocktakeId)
    .order("product_name");
  if (error) throw error;
  return (data ?? []) as StocktakeLine[];
}

export async function recordStocktakeScan(input: {
  stocktakeId: string;
  productId: string;
  code?: string | null;
  mode: StocktakeCountMode;
  quantity?: number;
  sourceSessionId?: string | null;
  clientEventId?: string;
}) {
  const client = supabase as any;
  const { data, error } = await client.rpc("record_inventory_stocktake_scan", {
    p_stocktake_id: input.stocktakeId,
    p_product_id: input.productId,
    p_client_event_id: input.clientEventId ?? crypto.randomUUID(),
    p_mode: input.mode,
    p_quantity: input.mode === "unit" ? 1 : input.quantity ?? 1,
    p_code: input.code ?? null,
    p_source_session_id: input.sourceSessionId ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.product_id) throw new Error("El conteo no devolvió una línea válida.");
  return row as {
    event_id: string;
    stocktake_id: string;
    product_id: string;
    system_qty: number;
    counted_qty: number;
    difference: number;
    inserted: boolean;
  };
}

export function subscribeToStocktake(
  stocktakeId: string,
  onChange: () => void,
) {
  const channel = supabase
    .channel(`stocktake-live:${stocktakeId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "inventory_stocktake_scan_events",
        filter: `stocktake_id=eq.${stocktakeId}`,
      },
      onChange,
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
