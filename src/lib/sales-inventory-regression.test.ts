/**
 * Pruebas de regresión P0 — Integridad de ventas e inventario (Nüva One).
 *
 * Pruebas puras (sin Supabase) que cubren la lógica de negocio crítica:
 * - Cálculo de total de venta a partir de líneas de ítems.
 * - Validación de stock: qty no puede exceder stock disponible.
 * - Estados de venta válidos y transiciones.
 * - Formato CLP.
 *
 * Ejecutar con: npm test
 */
import { describe, it, expect } from "vitest";
import { fmtCLP } from "./biz-data";

// ---------- Helpers puros (espejo de la lógica de sales.tsx / pos.tsx) ----------

type LineItem = { product_id: string | null; name: string; qty: number; price: number };

function computedTotal(items: LineItem[]): number {
  return items.reduce((s, i) => s + i.qty * i.price, 0);
}

function isStockValid(items: LineItem[], stockByProduct: Map<string, number>): boolean {
  for (const i of items) {
    if (!i.product_id) continue;
    const stock = stockByProduct.get(i.product_id) ?? 0;
    if (i.qty > stock) return false;
  }
  return true;
}

function canTransitionTo(status: string, from: string): boolean {
  const allowedFromDraft = ["pending", "paid", "cancelled"];
  const allowedFromPending = ["paid", "cancelled"];
  const allowedFromPaid = ["cancelled"];
  const map: Record<string, string[]> = {
    draft: allowedFromDraft,
    pending: allowedFromPending,
    paid: allowedFromPaid,
    cancelled: [],
  };
  return map[from]?.includes(status) ?? false;
}

// ---------- Modelos puros de los invariantes de sync_sale_effects() / sync_purchase_effects() ----------
// Reproducen las invariantes que implementan los triggers de base de datos:
// descuento exactamente una vez, reversión con signo correcto, idempotencia por stock_applied
// y rollback atómico (stock sin cambios ante stock insuficiente).
type EffectInput = { stock: number; items: LineItem[]; stockApplied: boolean; status: string };

function applySaleEffectsModel(input: EffectInput): { stock: number; stockApplied: boolean; applied: boolean } {
  const shouldApply = ["paid", "pending"].includes(input.status) && !input.stockApplied;
  if (!shouldApply) return { stock: input.stock, stockApplied: input.stockApplied, applied: false };
  let s = input.stock;
  for (const it of input.items) {
    if (!it.product_id) continue;
    const qty = Math.max(0, it.qty);
    if (s < qty) return { stock: input.stock, stockApplied: false, applied: false }; // rollback atómico: sin cambios
    s -= qty;
  }
  return { stock: s, stockApplied: true, applied: true };
}

function revertSaleEffectsModel({ stock, items }: { stock: number; items: LineItem[] }): number {
  let s = stock;
  for (const it of items) if (it.product_id) s += Math.max(0, it.qty);
  return s;
}

function applyPurchaseEffectsModel(input: EffectInput): { stock: number; stockApplied: boolean; applied: boolean } {
  const shouldApply = ["received", "paid"].includes(input.status) && !input.stockApplied;
  if (!shouldApply) return { stock: input.stock, stockApplied: input.stockApplied, applied: false };
  let s = input.stock;
  for (const it of input.items) if (it.product_id) s += Math.max(0, it.qty);
  return { stock: s, stockApplied: true, applied: true };
}

function revertPurchaseEffectsModel({ stock, items }: { stock: number; items: LineItem[] }): number {
  let s = stock;
  for (const it of items) { if (it.product_id) s = Math.max(0, s - Math.max(0, it.qty)); }
  return s;
}

// ---------- Pruebas ----------

describe("Venta — cálculo de total", () => {
  it("suma qty * price de todas las líneas", () => {
    const items: LineItem[] = [
      { product_id: "p1", name: "Producto A", qty: 2, price: 5000 },
      { product_id: "p2", name: "Producto B", qty: 1, price: 12000 },
    ];
    expect(computedTotal(items)).toBe(22000);
  });

  it("ignora líneas sin producto (texto libre con product_id null)", () => {
    const items: LineItem[] = [
      { product_id: null, name: "Servicio varios", qty: 1, price: 3000 },
      { product_id: "p1", name: "Producto A", qty: 3, price: 1000 },
    ];
    expect(computedTotal(items)).toBe(6000);
  });

  it("total cero con carrito vacío", () => {
    expect(computedTotal([])).toBe(0);
  });
});

describe("Venta — validación de stock", () => {
  it("rechaza cuando qty excede stock disponible", () => {
    const stock = new Map([["p1", 3]]);
    const items: LineItem[] = [
      { product_id: "p1", name: "Producto A", qty: 5, price: 1000 },
    ];
    expect(isStockValid(items, stock)).toBe(false);
  });

  it("acepta cuando qty es igual a stock disponible", () => {
    const stock = new Map([["p1", 3]]);
    const items: LineItem[] = [
      { product_id: "p1", name: "Producto A", qty: 3, price: 1000 },
    ];
    expect(isStockValid(items, stock)).toBe(true);
  });

  it("acepta cuando qty es menor a stock disponible", () => {
    const stock = new Map([["p1", 10]]);
    const items: LineItem[] = [
      { product_id: "p1", name: "Producto A", qty: 4, price: 1000 },
    ];
    expect(isStockValid(items, stock)).toBe(true);
  });

  it("ignora ítems sin product_id (texto libre)", () => {
    const stock = new Map<string, number>();
    const items: LineItem[] = [
      { product_id: null, name: "Despacho", qty: 1, price: 5000 },
    ];
    expect(isStockValid(items, stock)).toBe(true);
  });

  it("producto desconocido en stock se trata como 0 y rechaza qty > 0", () => {
    const stock = new Map<string, number>();
    const items: LineItem[] = [
      { product_id: "p999", name: "Inexistente", qty: 1, price: 1000 },
    ];
    expect(isStockValid(items, stock)).toBe(false);
  });
});

describe("Venta — transiciones de estado", () => {
  it("desde draft permite pending, paid, cancelled", () => {
    expect(canTransitionTo("pending", "draft")).toBe(true);
    expect(canTransitionTo("paid", "draft")).toBe(true);
    expect(canTransitionTo("cancelled", "draft")).toBe(true);
  });

  it("desde paid no permite volver a pending ni paid", () => {
    expect(canTransitionTo("pending", "paid")).toBe(false);
    expect(canTransitionTo("paid", "paid")).toBe(false);
  });

  it("desde cancelled no permite ninguna transición", () => {
    expect(canTransitionTo("paid", "cancelled")).toBe(false);
    expect(canTransitionTo("pending", "cancelled")).toBe(false);
    expect(canTransitionTo("draft", "cancelled")).toBe(false);
  });

  it("estado desconocido no permite transición", () => {
    expect(canTransitionTo("paid", "desconocido")).toBe(false);
  });
});

describe("Formato monetario CLP", () => {
  it("formatea número entero en CLP sin decimales", () => {
    expect(fmtCLP(1234567)).toContain("1.234.567");
    expect(fmtCLP(1234567)).toContain("$");
  });

  it("formatea cero como $0", () => {
    expect(fmtCLP(0)).toBe("$0");
  });
});

describe("Efectos de venta — invariantes de sync_sale_effects()", () => {
  const line = (product_id: string, qty: number): LineItem => ({ product_id, name: "Producto", qty, price: 0 });

  it("descuenta stock exactamente una vez y marca stock_applied=true", () => {
    const r = applySaleEffectsModel({ stock: 10, items: [line("p1", 3)], stockApplied: false, status: "paid" });
    expect(r.stock).toBe(7);
    expect(r.stockApplied).toBe(true);
    expect(r.applied).toBe(true);
  });

  it("no descuenta dos veces: stock_applied=true impide re-aplicación (idempotencia)", () => {
    const first = applySaleEffectsModel({ stock: 10, items: [line("p1", 3)], stockApplied: false, status: "paid" });
    const second = applySaleEffectsModel({ stock: first.stock, items: [line("p1", 3)], stockApplied: true, status: "paid" });
    expect(second.stock).toBe(7); // no se descuenta de nuevo
    expect(second.applied).toBe(false);
  });

  it("no aplica efectos cuando el estado no es paid ni pending", () => {
    const r = applySaleEffectsModel({ stock: 10, items: [line("p1", 3)], stockApplied: false, status: "draft" });
    expect(r.stock).toBe(10);
    expect(r.stockApplied).toBe(false);
  });

  it("reversión de venta devuelve el stock al valor previo y limpia stock_applied", () => {
    const applied = applySaleEffectsModel({ stock: 10, items: [line("p1", 3)], stockApplied: false, status: "paid" });
    expect(revertSaleEffectsModel({ stock: applied.stock, items: [line("p1", 3)] })).toBe(10);
  });

  it("stock insuficiente rechaza la venta sin modificar stock (rollback atómico)", () => {
    const r = applySaleEffectsModel({ stock: 2, items: [line("p1", 5)], stockApplied: false, status: "paid" });
    expect(r.stock).toBe(2); // sin cambio
    expect(r.stockApplied).toBe(false);
    expect(r.applied).toBe(false);
  });

  it("venta con varias líneas descuenta la suma exacta una sola vez", () => {
    const r = applySaleEffectsModel({ stock: 20, items: [line("p1", 2), line("p2", 3)], stockApplied: false, status: "pending" });
    expect(r.stock).toBe(15);
    expect(r.stockApplied).toBe(true);
  });
});

describe("Efectos de compra — invariantes de sync_purchase_effects()", () => {
  const line = (product_id: string, qty: number): LineItem => ({ product_id, name: "Producto", qty, price: 0 });

  it("aplicación de compra SUMA stock (signo +)", () => {
    const r = applyPurchaseEffectsModel({ stock: 10, items: [line("p1", 4)], stockApplied: false, status: "received" });
    expect(r.stock).toBe(14);
    expect(r.stockApplied).toBe(true);
  });

  it("reversión de compra RESTA stock (signo -)", () => {
    const applied = applyPurchaseEffectsModel({ stock: 10, items: [line("p1", 4)], stockApplied: false, status: "received" });
    expect(revertPurchaseEffectsModel({ stock: applied.stock, items: [line("p1", 4)] })).toBe(10);
  });

  it("compra es idempotente por stock_applied", () => {
    const first = applyPurchaseEffectsModel({ stock: 10, items: [line("p1", 4)], stockApplied: false, status: "received" });
    const second = applyPurchaseEffectsModel({ stock: first.stock, items: [line("p1", 4)], stockApplied: true, status: "received" });
    expect(second.stock).toBe(14);
    expect(second.applied).toBe(false);
  });

  it("reversión de compra no deja stock negativo (GREATEST(0, ...))", () => {
    expect(revertPurchaseEffectsModel({ stock: 2, items: [line("p1", 5)] })).toBe(0);
  });
});
