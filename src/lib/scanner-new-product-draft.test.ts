import { describe, expect, it } from "vitest";
import { buildNewProductDraft } from "./scanner-new-product-draft";

describe("buildNewProductDraft", () => {
  it("normalizes product data and scanner code", () => {
    const draft = buildNewProductDraft({
      rawCode: "  036000291452  ",
      name: "  Producto Demo  ",
      sku: " sku-01 ",
      category: "  Bebidas ",
      supplier: "  Proveedor ",
      cost: "1,50",
      price: "2.90",
      initialStock: "4",
    });

    expect(draft).toEqual({
      code: "036000291452",
      codeKind: "UPC-A",
      name: "Producto Demo",
      sku: "SKU-01",
      category: "Bebidas",
      supplier: "Proveedor",
      cost: 1.5,
      price: 2.9,
      initialStock: 4,
    });
  });

  it("rejects an invalid barcode", () => {
    expect(() => buildNewProductDraft({ rawCode: "123456789012", name: "Demo" })).toThrow();
  });

  it("requires a product name", () => {
    expect(() => buildNewProductDraft({ rawCode: "036000291452", name: " " })).toThrow("nombre");
  });

  it("rejects negative financial or stock values", () => {
    expect(() =>
      buildNewProductDraft({ rawCode: "036000291452", name: "Demo", cost: -1 }),
    ).toThrow();
    expect(() =>
      buildNewProductDraft({ rawCode: "036000291452", name: "Demo", initialStock: -1 }),
    ).toThrow();
  });
});
