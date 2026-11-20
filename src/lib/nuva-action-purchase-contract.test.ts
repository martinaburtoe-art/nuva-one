import { describe, expect, it } from "vitest";
import { actionOutcomeMatchesResult, buildPurchaseRecordItems, parsePurchaseActionPayload, purchaseRecordMatchesAction } from "./nuva-action-purchase-contract";

describe("parsePurchaseActionPayload", () => {
  const base = { supplier_id: "supplier-1", tax_treatment: "taxable", vat_rate: 19 };

  it("rejects a generic recommendation payload", () => {
    expect(parsePurchaseActionPayload({ action: "Reponer stock", cta: "Preparar compra" })).toMatchObject({
      ok: false,
      reason: expect.stringContaining("proveedor"),
    });
  });

  it("rejects a missing or empty product list", () => {
    expect(parsePurchaseActionPayload({ ...base, items: [] })).toMatchObject({ ok: false });
  });

  it("rejects missing product identity, invalid quantities and invalid costs", () => {
    expect(parsePurchaseActionPayload({ ...base, items: [{ quantity: 2, unit_cost: 100 }] })).toMatchObject({ ok: false });
    expect(parsePurchaseActionPayload({ ...base, items: [{ product_id: "p1", quantity: 0, unit_cost: 100 }] })).toMatchObject({ ok: false });
    expect(parsePurchaseActionPayload({ ...base, items: [{ product_id: "p1", quantity: 2, unit_cost: 0 }] })).toMatchObject({ ok: false });
    expect(parsePurchaseActionPayload({ ...base, items: [{ product_id: "p1", quantity: true, unit_cost: 100 }] })).toMatchObject({ ok: false });
    expect(parsePurchaseActionPayload({ ...base, items: [{ product_id: "p1", quantity: 1.5, unit_cost: 100 }] })).toMatchObject({ ok: false });
    expect(parsePurchaseActionPayload({ ...base, items: [{ product_id: "p1", quantity: 1, unit_cost: 100.5 }] })).toMatchObject({ ok: false });
    expect(parsePurchaseActionPayload({ ...base, items: [{ product_id: "p1", quantity: 1000000000, unit_cost: 1000000000 }] })).toMatchObject({ ok: false, reason: expect.stringContaining("rango numérico") });
  });

  it("rejects duplicate product lines to avoid ambiguous totals", () => {
    expect(parsePurchaseActionPayload({
      ...base,
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
  const base = { supplier_id: "supplier-1", items: [{ product_id: "p1", quantity: 1, unit_cost: 1000 }] };

  it("accepts exempt and non-taxable documents only with zero VAT", () => {
    const items = [{ product_id: "p1", quantity: 1, unit_cost: 1000 }];
    expect(parsePurchaseActionPayload({ supplier_id: "supplier-1", tax_treatment: "exempt", vat_rate: 0, items })).toMatchObject({
      ok: true,
      value: { tax_treatment: "exempt", vat_rate: 0 },
    });
    expect(parsePurchaseActionPayload({ supplier_id: "supplier-1", tax_treatment: "non_taxable", vat_rate: 0, items })).toMatchObject({
      ok: true,
      value: { tax_treatment: "non_taxable", vat_rate: 0 },
    });
  });

  it("rejects missing or inconsistent tax treatment", () => {
    expect(parsePurchaseActionPayload(base)).toMatchObject({ ok: false, reason: expect.stringContaining("tributario") });
    expect(parsePurchaseActionPayload({ ...base, tax_treatment: "taxable", vat_rate: 0 })).toMatchObject({ ok: false, reason: expect.stringContaining("IVA") });
    expect(parsePurchaseActionPayload({ ...base, tax_treatment: "exempt", vat_rate: 19 })).toMatchObject({ ok: false, reason: expect.stringContaining("IVA") });
  });
});


describe("purchaseRecordMatchesAction", () => {
  const expected = {
    supplier_id: "supplier-1",
    tax_treatment: "taxable" as const,
    vat_rate: 19 as const,
    total: 2500,
    items: [{ product_id: "p1", name: "Producto", qty: 2, quantity: 2, unit_cost: 1250, total: 2500 }],
  };

  it("accepts the same persisted purchase even if its display name changed", () => {
    expect(purchaseRecordMatchesAction({
      ...expected,
      items: [{ product_id: "p1", name: "Nombre actualizado", qty: 2, quantity: 2, unit_cost: 1250, total: 2500 }],
    }, expected)).toBe(true);
  });

  it("rejects a replay whose supplier, tax treatment or amounts changed", () => {
    expect(purchaseRecordMatchesAction({ ...expected, supplier_id: "supplier-2" }, expected)).toBe(false);
    expect(purchaseRecordMatchesAction({ ...expected, vat_rate: 0 }, expected)).toBe(false);
    expect(purchaseRecordMatchesAction({ ...expected, total: 2600 }, expected)).toBe(false);
  });

  it("rejects a replay whose product quantities or unit costs changed", () => {
    expect(purchaseRecordMatchesAction({
      ...expected,
      items: [{ product_id: "p1", qty: 3, unit_cost: 1250, total: 3750 }],
    }, expected)).toBe(false);
  });

  it("rejects malformed or missing persisted item data", () => {
    expect(purchaseRecordMatchesAction({ ...expected, items: null }, expected)).toBe(false);
    expect(purchaseRecordMatchesAction(null, expected)).toBe(false);
  });
});


describe("actionOutcomeMatchesResult", () => {
  const expected = {
    operation: "purchase_draft_created",
    record_id: "purchase-1",
    total: 2500,
    currency: "CLP",
    line_count: 1,
    status: "pending",
    idempotent_replay: false,
  };

  it("accepts the same immutable purchase evidence after status or replay metadata changes", () => {
    expect(actionOutcomeMatchesResult({
      ...expected,
      status: "received",
      idempotent_replay: true,
    }, expected)).toBe(true);
  });

  it("rejects a conflicting record, operation, amount, currency or line count", () => {
    expect(actionOutcomeMatchesResult({ ...expected, record_id: "purchase-2" }, expected)).toBe(false);
    expect(actionOutcomeMatchesResult({ ...expected, operation: "purchase_created" }, expected)).toBe(false);
    expect(actionOutcomeMatchesResult({ ...expected, total: 2600 }, expected)).toBe(false);
    expect(actionOutcomeMatchesResult({ ...expected, currency: "USD" }, expected)).toBe(false);
    expect(actionOutcomeMatchesResult({ ...expected, line_count: 2 }, expected)).toBe(false);
  });

  it("supports activity outcomes without purchase-specific fields", () => {
    const activity = { operation: "customer_task_created", record_id: "activity-1" };
    expect(actionOutcomeMatchesResult(activity, activity)).toBe(true);
  });

  it("rejects missing or malformed evidence", () => {
    expect(actionOutcomeMatchesResult(null, expected)).toBe(false);
    expect(actionOutcomeMatchesResult([], expected)).toBe(false);
    expect(actionOutcomeMatchesResult({ operation: "purchase_draft_created" }, expected)).toBe(false);
  });
});
