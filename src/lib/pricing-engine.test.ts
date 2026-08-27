import { describe, expect, it } from "vitest";
import { calculatePricing, priceWithVat, priceWithoutVat, type PricingInput } from "./pricing-engine";

const base: PricingInput = {
  productType: "resale", directCost: 10000, laborCost: 0, packagingCost: 500, logisticsCost: 500,
  otherVariableCost: 0, wasteRate: 0, fixedCostsMonthly: 1000000, expectedUnitsMonthly: 100,
  targetMargin: 0.3, paymentFeeRate: 0.05, salesCommissionRate: 0, marketplaceFeeRate: 0,
  returnRate: 0, warrantyRate: 0, ownerHourlyCost: 0, ownerHoursPerUnit: 0, abcMonthlyAllocation: 0,
  competitorPrices: [17000, 18000, 19000], differentiationScore: 5, valueScore: 5,
  referenceValue: 0, differentiatedValue: 0, valueCaptureRate: 0.2, elasticity: null,
  currentPrice: 0, discountRate: 0, vatRate: 0.19, vatIncluded: false, psychologicalPricing: false,
};

describe("pricing-engine", () => {
  it("calculates target price with percentage fees without confusing markup and margin", () => {
    const result = calculatePricing({ ...base, fixedCostsMonthly: 0, expectedUnitsMonthly: 1 });
    expect(result.fullUnitCost).toBe(11000);
    expect(result.targetPrice).toBeCloseTo(11000 / 0.65, 6);
    expect(result.contributionMarginRate).toBeCloseTo(0.3, 6);
  });

  it("adjusts cost for waste using yield, not a simple multiplier", () => {
    const result = calculatePricing({ ...base, fixedCostsMonthly: 0, expectedUnitsMonthly: 1, wasteRate: 0.1 });
    expect(result.variableUnitCost).toBeCloseTo(11000 / 0.9, 6);
  });

  it("calculates break-even from contribution margin", () => {
    const result = calculatePricing({ ...base, fixedCostsMonthly: 1000000, expectedUnitsMonthly: 100, targetMargin: 0.2, paymentFeeRate: 0 });
    expect(result.breakEvenUnits).not.toBeNull();
    expect(result.breakEvenUnits!).toBeGreaterThan(0);
  });

  it("returns null break-even when contribution is not positive", () => {
    const result = calculatePricing({ ...base, targetMargin: 0.9, paymentFeeRate: 0.2 });
    expect(result.breakEvenUnits).toBeNull();
    expect(result.warnings.some((w) => w.severity === "critical")).toBe(true);
  });

  it("handles VAT conversion independently from pricing economics", () => {
    expect(priceWithVat(10000, 0.19)).toBe(11900);
    expect(priceWithoutVat(11900, 0.19)).toBeCloseTo(10000, 8);
  });

  it("uses market data when available and exposes confidence", () => {
    const result = calculatePricing(base);
    expect(result.marketPrice).toBe(18000);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(60);
    expect(result.scenarios).toHaveLength(5);
  });
});
