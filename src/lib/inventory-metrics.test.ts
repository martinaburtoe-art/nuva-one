import { describe, expect, it } from "vitest";
import { getAvailableStock, getInventoryMetrics, getInventoryStatus, getProjectedStock, getSuggestedReplenishment } from "./inventory-metrics";

describe("inventory metrics", () => {
  it("subtracts reserved and blocked stock from availability", () => {
    expect(getAvailableStock({ stock: 20, reserved_stock: 5, blocked_stock: 3 })).toBe(12);
  });

  it("never exposes negative availability", () => {
    expect(getAvailableStock({ stock: 2, reserved_stock: 5, blocked_stock: 1 })).toBe(0);
  });

  it("includes in-transit stock only in projected stock", () => {
    const product = { stock: 10, reserved_stock: 2, blocked_stock: 1, in_transit_stock: 8 };
    expect(getAvailableStock(product)).toBe(7);
    expect(getProjectedStock(product)).toBe(15);
  });

  it("classifies stock using operational availability", () => {
    expect(getInventoryStatus({ stock: 10, reserved_stock: 10, low_stock_threshold: 2 })).toBe("out_of_stock");
    expect(getInventoryStatus({ stock: 5, reserved_stock: 3, low_stock_threshold: 2 })).toBe("critical");
    expect(getInventoryStatus({ stock: 8, reorder_point: 8 })).toBe("reorder");
    expect(getInventoryStatus({ stock: 10, reorder_point: 5 })).toBe("healthy");
  });

  it("does not recommend replenishment when projected stock reaches the target", () => {
    expect(getSuggestedReplenishment({ stock: 5, in_transit_stock: 5, max_stock: 10 })).toBe(0);
    expect(getInventoryMetrics({ stock: 2, max_stock: 10 }).suggestedReplenishment).toBe(8);
  });
});
