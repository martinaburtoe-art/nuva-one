import { describe, expect, it } from "vitest";
import { calculateQuoteTotals, formatQuoteNumber } from "./quote-calculations";

describe("quote calculations", () => {
  it("calculates net taxable prices and applies discount before VAT", () => {
    expect(calculateQuoteTotals(
      [{ name: "Servicio", qty: 2, price: 10000 }],
      10,
      "taxable",
    )).toEqual({
      subtotal: 20000,
      discountAmount: 2000,
      discountPct: 10,
      taxableBase: 18000,
      tax: 3420,
      vatRate: 19,
      taxTreatment: "taxable",
      priceBasis: "net",
      total: 21420,
    });
  });

  it("extracts included VAT from gross unit prices without adding it twice", () => {
    expect(calculateQuoteTotals(
      [{ name: "Producto", qty: 1, price: 1190 }],
      0,
      "taxable",
      19,
      "gross",
    )).toMatchObject({ subtotal: 1000, tax: 190, total: 1190, priceBasis: "gross" });
  });

  it("applies discounts to the net tax base when entered prices include VAT", () => {
    expect(calculateQuoteTotals(
      [{ name: "Producto", qty: 1, price: 1190 }],
      10,
      "taxable",
      19,
      "gross",
    )).toMatchObject({ subtotal: 1000, discountAmount: 100, taxableBase: 900, tax: 171, total: 1071 });
  });

  it("does not add VAT to exempt or non-taxable operations", () => {
    for (const treatment of ["exempt", "non_taxable"] as const) {
      const result = calculateQuoteTotals([{ name: "Servicio", qty: 1, price: 19990 }], 0, treatment);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(19990);
      expect(result.vatRate).toBe(0);
    }
  });

  it("supports decimal quantities with deterministic CLP rounding", () => {
    const result = calculateQuoteTotals([{ name: "Metros", qty: 1.5, price: 1001 }], 0, "taxable");
    expect(result.subtotal).toBe(1502);
    expect(result.tax).toBe(285);
    expect(result.total).toBe(1787);
  });

  it("rejects invalid quantities, prices, discount and rates", () => {
    expect(() => calculateQuoteTotals([{ name: "x", qty: 0, price: 10 }], 0, "taxable")).toThrow();
    expect(() => calculateQuoteTotals([{ name: "x", qty: 1, price: -1 }], 0, "taxable")).toThrow();
    expect(() => calculateQuoteTotals([{ name: "x", qty: 1, price: 10 }], 101, "taxable")).toThrow();
    expect(() => calculateQuoteTotals([{ name: "x", qty: 1, price: 10 }], 0, "taxable", 101)).toThrow();
  });

  it("formats quote identifiers without inventing a number", () => {
    expect(formatQuoteNumber(12)).toBe("COT-0012");
    expect(formatQuoteNumber(null)).toBe("BORRADOR");
  });
});
