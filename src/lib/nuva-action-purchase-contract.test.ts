import { describe, expect, it } from "vitest";
import { parsePurchaseActionPayload } from "./nuva-action-purchase-contract";

describe("parsePurchaseActionPayload", () => {
  it("rejects a generic recommendation payload", () => {
    expect(parsePurchaseActionPayload({ action: "Reponer stock", cta: "Preparar compra" })).toMatchObject({
      ok: false,
      reason: expect.stringContaining("proveedor"),
    });
  });

  it("rejects a missing or empty product list", () => {
    expect(parsePurchaseActionPayload({ supplier_id: "supplier-1", items: [] })).toMatchObject({ ok: false });
  });

  it("rejects missing product identity, invalid quantities and invalid costs", () => {
    const base = { supplier_id: "supplier-1" };
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
      items: [
        { product_id: "p1", quantity: 2, unit_cost: 100 },
        { product_id: "p1", quantity: 3, unit_cost: 100 },
      ],
    })).toMatchObject({ ok: false, reason: expect.stringContaining("duplicado") });
  });

  it("normalizes numeric values and accepts a complete purchase payload", () => {
    expect(parsePurchaseActionPayload({
      supplier_id: " supplier-1 ",
      items: [{ product_id: "p1", quantity: "2", unit_cost: "1250.5" }],
    })).toEqual({
      ok: true,
      value: {
        supplier_id: "supplier-1",
        items: [{ product_id: "p1", quantity: 2, unit_cost: 1250.5 }],
      },
    });
  });
});
