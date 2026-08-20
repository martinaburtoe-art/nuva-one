import { describe, expect, it, vi } from "vitest";
import { createProductFromScanner } from "./scanner-product-onboarding";

describe("createProductFromScanner", () => {
  it("maps the onboarding payload to the atomic RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ product_id: "p1", sku: "NVA-PRD-0001", code: "036000291452", stock_before: 0, stock_after: 4 }],
      error: null,
    });
    const client = { rpc } as never;

    const result = await createProductFromScanner(client, {
      businessId: "b1",
      name: "Producto Demo",
      code: " 036000291452 ",
      codeType: "upc_a",
      sku: " SKU-01 ",
      category: "Bebidas",
      cost: 1.5,
      price: 2.9,
      initialStock: 4,
      lowStockThreshold: 7,
    });

    expect(rpc).toHaveBeenCalledWith("create_product_from_scanner", {
      p_business_id: "b1",
      p_name: "Producto Demo",
      p_code: "036000291452",
      p_code_type: "upc_a",
      p_sku: "SKU-01",
      p_category: "Bebidas",
      p_cost: 1.5,
      p_price: 2.9,
      p_initial_stock: 4,
      p_low_stock_threshold: 7,
    });
    expect(result.product_id).toBe("p1");
    expect(result.stock_after).toBe(4);
  });

  it("surfaces RPC failures", async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("RPC failed") }) } as never;
    await expect(createProductFromScanner(client, { businessId: "b1", name: "Demo", code: "036000291452", codeType: "upc_a" })).rejects.toThrow("RPC failed");
  });

  it("rejects an empty RPC result", async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: [], error: null }) } as never;
    await expect(createProductFromScanner(client, { businessId: "b1", name: "Demo", code: "036000291452", codeType: "upc_a" })).rejects.toThrow("producto válido");
  });
});
