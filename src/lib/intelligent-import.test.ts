import { describe, expect, it } from "vitest";
import { buildIntelligentRows, detectField, parseNumber } from "./intelligent-import";

describe("intelligent import", () => {
  it("maps SKU, product name and stock under different headers", () => {
    const result = buildIntelligentRows("Código;Nombre del artículo;Existencias\nABC-1;Camiseta;12\nABC-2;Pantalón;7");
    expect(result.detections.map((d) => d.field)).toEqual(["sku", "name", "stock"]);
    expect(result.rows[0].mapped).toMatchObject({ sku: "ABC-1", name: "Camiseta", stock: "12" });
  });

  it("recognizes operational variants such as EAN and precio de venta", () => {
    expect(detectField("EAN 13", ["7801234567890"])?.field).toBe("barcode");
    expect(detectField("Precio de venta", ["12990"])?.field).toBe("price");
    expect(detectField("Punto de reposición", ["5"])?.field).toBe("reorderPoint");
  });

  it("parses Chilean and international number formats", () => {
    expect(parseNumber("$ 12.990")).toBe(12990);
    expect(parseNumber("12.990,50")).toBe(12990.5);
    expect(parseNumber("12990.50")).toBe(12990.5);
  });

  it("warns when a source has no clear identifier", () => {
    const result = buildIntelligentRows("Descripción|Cantidad\nCamiseta|10");
    expect(result.rows[0].warnings).toContain("No hay identificador único claro; Nüva usará el nombre con cautela.");
  });
});
