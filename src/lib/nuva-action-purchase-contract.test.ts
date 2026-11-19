import { describe, expect, it } from "vitest";
import { buildPurchaseRecordItems, parsePurchaseActionPayload } from "./nuva-action-purchase-contract";

describe("parsePurchaseActionPayload", () => {
  it("rejects a generic recommendation payload", () => {
    expect(parsePurchaseActionPayload({ action: "Reponer stock", cta: "Preparar compra" })).toMatchObject({
      ok: false,
      reason: expect.stringContaining("proveedor"),
    });
});
  });

  it("rejects a missing or empty product list", () => {
    expect(parsePurchaseActionPayload({ supplier_id: "supplier-1", tax_treatment: "taxable", vat_rate: 19, items: [] })).toMatchObject({ ok: false });
  });

  it("rejects missing product identity, invalid quantities and invalid costs", () => {
    const base = { supplier_id: "supplier-1", tax_treatment: "taxable", vat_rate: 19 };
    expect(parsePurchaseActionPayload({ ...base, items: [{ quantity: 2, unit_cost: 100 }] })).toMatchObject({ ok: false });
    expect(parsePurchaseActionPayload({ ...base, items: [{ product_id: "p1", quantity: 0, unit_cost: 100 }] })).toMatchObject({ ok: false });
    expect(parsePurchaseActionPayload({ ...base, items: [{ product_id: "p1", quantity: 2, unit_cost: 0 }] })).toMatchObject({ ok: false });
    expect(parsePurchaseActionPayload({ ...base, items: [{ product_id: "p1", quantity: true, unit_cost: 100 }] })).toMatchObject({ ok: false });
    expect(parsePurchaseActionPayload({ ...base, items: [{ product_id: "p1", quantity: 1.5, unit_cost: 100 }] })).toMatchObject({ ok: false });
    expect(parsePurchaseActionPayload({ ...base, items: [{ product_id: "p1", quantity: 1, unit_cost: 100.5 }] })).toMatchObject({ ok: false });
  });

  it("rejects duplicate product lines to avoid ambiguous totals", () => {
    expect(parsePurchaseActionPayload({
      supplier_id: "supplier-1",
      tax_treatment: "taxable",
      vat_rate: 19,
      items: [
        { product_id: "p1", quantity: 2, unit_cost: 100 },
        { product_id: "p1", quantity: 3, unit_cost: 100 },
      ],
    })).toMatchObject({ ok: false, reason: expect.stringContaining("duplicado") });
  });

  it("normalizes numeric values and accepts a complete purchase payload", () => {
    expect(parsePurchaseActionPayload({
      supplier_id: " supplier-1 ",
      tax_treatment: "taxable",
      vat_rate: 19,
      items: [{ product_id: "p1", quantity: "2", unit_cost: "1250" }],
    })).toEqual({
      ok: true,
      value: {
        supplier_id: "supplier-1",
        tax_treatment: "taxable",
        vat_rate: 19,
        items: [{ product_id: "p1", quantity: 2, unit_cost: 1250 }],
      },
    });
  });
});

describe("buildPurchaseRecordItems", () => {
  it("maps validated units to the qty field required by the stock lifecycle trigger", () => {
    const items = buildPurchaseRecordItems(
      [{ product_id: "p1", quantity: 3, unit_cost: 1250 }],
      new Map([["p1", "Producto real"]]),
    );
    expect(items).toEqual([{
      product_id: "p1",
      name: "Producto real",
      qty: 3,
      quantity: 3,
      unit_cost: 1250,
      total: 3750,
    }]);
  });
});

describe("purchase tax treatment", () => {
  it("rejects missing or inconsistent tax treatment", () => {
    const base = { supplier_id: "supplier-1", items: [{ product_id: "p1", quantity: 1, unit_cost: 1000 }] };
    expect(parsePurchaseActionPayload(base)).toMatchObject({ ok: false, reason: expect.stringContaining("tributario") });
    expect(parsePurchaseActionPayload({ ...base, tax_treatment: "taxable", vat_rate: 0 })).toMatchObject({ ok: false, reason: expect.stringContaining("IVA") });
    expect(parsePurchaseActionPayload({ ...base, tax_treatment: "exempt", vat_rate: 19 })).toMatchObject({ ok: false, reason: expect.stringContaining("IVA") });
  });
