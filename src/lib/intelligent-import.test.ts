import { describe, expect, it } from "vitest";
import { buildIntelligentRows, detectField, parseNumber } from "./intelligent-import";

describe("intelligent import", () => {
  it("maps SKU, product name and stock under different headers", () => {
    const result = buildIntelligentRows("Código;Nombre del artículo;Existencias\nABC-1;Camiseta;12\nABC-2;Pantalón;7");
    expect(result.detections.map((d) => d.field)).toEqual(["sku", "name", "stock"]);
    expect(result.rows[0].mapped).toMatchObject({ sku: "ABC-1", name: "Camiseta", stock: "12" });
    expect(result.quality).toBe("high");
  });

  it("recognizes operational variants such as EAN and precio de venta", () => {
    expect(detectField("EAN 13", ["7801234567890"])?.field).toBe("barcode");
    expect(detectField("Precio de venta", ["12990"])?.field).toBe("price");
    expect(detectField("Punto de reposición", ["5"])?.field).toBe("reorderPoint");
    expect(detectField("On Hand", ["24"])?.field).toBe("stock");
    expect(detectField("Purchase Price", ["18990"])?.field).toBe("cost");
    expect(detectField("Item Name", ["Polera deportiva"])?.field).toBe("name");
  });

  it("uses content shape to strengthen weak header names", () => {
    expect(detectField("Código", ["7801234567890", "7801234567891"])?.field).toBe("barcode");
    expect(detectField("Cantidad", ["12", "8", "3"])?.field).toBe("stock");
  });

  it("parses Chilean and international number formats", () => {
    expect(parseNumber("$ 12.990")).toBe(12990);
    expect(parseNumber("12.990,50")).toBe(12990.5);
    expect(parseNumber("12990.50")).toBe(12990.5);
    expect(parseNumber("(1.250)")).toBe(-1250);
  });

  it("warns when a source has no clear identifier", () => {
    const result = buildIntelligentRows("Descripción|Cantidad\nCamiseta|10");
    expect(result.rows[0].warnings).toContain("No hay identificador único claro; Nüva usará el nombre con cautela.");
  });

  it("detects duplicate identifiers instead of silently merging them", () => {
    const result = buildIntelligentRows("SKU;Producto;Stock\nABC-1;Camiseta;10\nABC-1;Camiseta roja;4");
    expect(result.duplicateIdentifiers).toContain("abc 1");
    expect(result.rows.every((row) => row.warnings.some((warning) => warning.includes("Identificador repetido")))).toBe(true);
  });

  it("reports unmapped columns so the user knows what Nüva did not infer", () => {
    const result = buildIntelligentRows("Producto;Stock;Dato desconocido\nCamiseta;10;ABC");
    expect(result.unmappedHeaders).toContain("Dato desconocido");
  });
});
