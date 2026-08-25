import { describe, expect, it } from "vitest";
import { getInventoryMetrics } from "./inventory-action-center";

const product = (overrides = {}) => ({
  id: "p1",
  name: "Producto",
  sku: "SKU-1",
  stock: 10,
  low_stock_threshold: 3,
  max_stock: 12,
  reorder_point: 5,
  reserved_stock: 0,
  blocked_stock: 0,
  in_transit_stock: 0,
  cost: 1000,
  ...overrides,
});

describe("getInventoryMetrics", () => {
  it("calculates available stock after reservations and blocks", () => {
    const metrics = getInventoryMetrics(
      product({ stock: 10, reserved_stock: 3, blocked_stock: 4 }),
    );
    expect(metrics.available).toBe(3);
    expect(metrics.health).toBe("critical");
  });

  it("does not allow reserved or blocked stock to exceed physical stock", () => {
    const metrics = getInventoryMetrics(product({ stock: 5, reserved_stock: 9, blocked_stock: 9 }));
    expect(metrics.reserved).toBe(5);
    expect(metrics.blocked).toBe(0);
    expect(metrics.available).toBe(0);
    expect(metrics.health).toBe("out_of_stock");
  });

  it("uses in-transit units only for projected availability", () => {
    const metrics = getInventoryMetrics(product({ stock: 2, in_transit_stock: 8, max_stock: 12 }));
    expect(metrics.available).toBe(2);
    expect(metrics.projected).toBe(10);
    expect(metrics.suggestedOrder).toBe(2);
  });

  it("does not invent a purchase quantity when no target is configured", () => {
    const metrics = getInventoryMetrics(
      product({ stock: 0, low_stock_threshold: 0, reorder_point: 0, max_stock: 0 }),
    );
    expect(metrics.target).toBe(0);
    expect(metrics.suggestedOrder).toBe(0);
    expect(metrics.health).toBe("out_of_stock");
  });
});
