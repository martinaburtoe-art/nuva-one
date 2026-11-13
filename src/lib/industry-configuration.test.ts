import { describe, expect, it } from "vitest";
import { buildIndustryConfiguration } from "@/lib/industry-configuration";

describe("industry configuration contract", () => {
  it("uses opt-in defaults and does not enable optional operations", () => {
    const r = buildIndustryConfiguration("hardware_store");
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.configuration.inventory.allowFractionalQuantity).toBe(false); expect(r.requestedCapabilities).toEqual([]); }
  });
  it("captures ferreteria preferences but gates unavailable capabilities", () => {
    const r = buildIndustryConfiguration("hardware_store", { channels: ["counter", "delivery"], inventory: { baseUnit: "un", purchaseUnits: ["caja"], saleUnits: ["un"], allowFractionalQuantity: true, multipleWarehouses: true }, commercial: { priceLists: true, volumePricing: true }, operations: { scheduledDispatch: true } });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.availableCapabilities).toEqual(["dispatch"]); expect(r.plannedCapabilities).toEqual(expect.arrayContaining(["fractional_units", "multi_warehouse", "price_lists", "volume_pricing"])); }
  });
  it("requires lot tracking before expiry tracking", () => {
    const r = buildIndustryConfiguration("neighborhood_grocery", { inventory: { trackExpiry: true } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.code)).toContain("expiry_requires_lots");
  });
  it("requires product-specific conversion for package-to-unit sales", () => {
    const r = buildIndustryConfiguration("hardware_store", { inventory: { baseUnit: "un", purchaseUnits: ["caja"], saleUnits: ["un"] } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.plannedCapabilities).toContain("unit_conversions");
  });
  it("rejects incompatible purchase/sale dimensions", () => {
    const r = buildIndustryConfiguration("neighborhood_grocery", { inventory: { baseUnit: "kg", purchaseUnits: ["caja"], saleUnits: ["un"] } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.code)).toContain("incompatible_units");
  });
  it("keeps wholesale credit, price lists and warehouse requests planned", () => {
    const r = buildIndustryConfiguration("wholesale_distribution", { channels: ["wholesale", "delivery"], inventory: { multipleWarehouses: true }, commercial: { priceLists: true, customerCredit: true, volumePricing: true } });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.availableCapabilities).toEqual([]); expect(r.plannedCapabilities).toEqual(expect.arrayContaining(["multi_warehouse", "price_lists", "credit_accounts", "volume_pricing"])); }
  });
  it("rejects unknown fields, channels and profiles", () => {
    expect(buildIndustryConfiguration("unknown_profile").ok).toBe(false);
    const unknownField = buildIndustryConfiguration("hardware_store", { inventory: { allowFractionalQuantity: true, stockOverride: 99 } } as never);
    expect(unknownField.ok).toBe(false);
    expect(buildIndustryConfiguration("hardware_store", { channels: ["counter", "teleport"] as never }).ok).toBe(false);
  });
});
