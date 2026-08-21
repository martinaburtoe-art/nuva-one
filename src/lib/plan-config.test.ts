import { describe, expect, it } from "vitest";
import { NUVA_PLANS, formatClp, getNuvaPlan } from "./plan-config";

describe("NUVA_PLANS", () => {
  it("keeps the two commercial plans with the agreed pricing", () => {
    expect(NUVA_PLANS.starter.monthlyPriceClp).toBe(11_990);
    expect(NUVA_PLANS.starter.annualPriceClp).toBe(119_900);
    expect(NUVA_PLANS.pro.monthlyPriceClp).toBe(27_990);
    expect(NUVA_PLANS.pro.annualPriceClp).toBe(279_900);
  });

  it("keeps limits and feature tiers coherent", () => {
    expect(NUVA_PLANS.starter.includedUsers).toBe(1);
    expect(NUVA_PLANS.starter.maxProducts).toBe(500);
    expect(NUVA_PLANS.starter.aiMessagesMonthly).toBe(100);
    expect(NUVA_PLANS.starter.storageMb).toBe(2_048);
    expect(NUVA_PLANS.starter.features.advancedFinance).toBe(false);
    expect(NUVA_PLANS.starter.features.nuvaRadar).toBe(false);

    expect(NUVA_PLANS.pro.includedUsers).toBe(3);
    expect(NUVA_PLANS.pro.maxProducts).toBe(5_000);
    expect(NUVA_PLANS.pro.aiMessagesMonthly).toBe(500);
    expect(NUVA_PLANS.pro.storageMb).toBe(10_240);
    expect(NUVA_PLANS.pro.features.advancedFinance).toBe(true);
    expect(NUVA_PLANS.pro.features.nuvaRadar).toBe(true);
    expect(NUVA_PLANS.pro.features.nuvaCopilot).toBe(true);
  });

  it("defaults unknown plans safely to Start", () => {
    expect(getNuvaPlan(undefined)).toBe(NUVA_PLANS.starter);
    expect(getNuvaPlan(null)).toBe(NUVA_PLANS.starter);
    expect(getNuvaPlan("unknown")).toBe(NUVA_PLANS.starter);
    expect(getNuvaPlan("pro")).toBe(NUVA_PLANS.pro);
  });

  it("formats Chilean prices without decimal places", () => {
    expect(formatClp(11_990)).toContain("11.990");
    expect(formatClp(27_990)).toContain("27.990");
  });
});
