import { describe, expect, it } from "vitest";
import { canUseQuantity, getPlanLimit, hasPlanFeature, resolvePlan } from "./plan-access";

describe("plan access", () => {
  it("defaults unknown plans to Start instead of granting Pro", () => {
    expect(resolvePlan("enterprise")).toBe("starter");
    expect(getPlanLimit("enterprise", "products")).toBe(500);
    expect(hasPlanFeature("enterprise", "nuvaCopilot")).toBe(false);
  });

  it("exposes the configured Start limits", () => {
    expect(getPlanLimit("starter", "users")).toBe(1);
    expect(getPlanLimit("starter", "products")).toBe(500);
    expect(getPlanLimit("starter", "aiMessagesMonthly")).toBe(100);
    expect(getPlanLimit("starter", "storageMb")).toBe(2048);
    expect(hasPlanFeature("starter", "advancedFinance")).toBe(false);
  });

  it("exposes the configured Pro limits and features", () => {
    expect(getPlanLimit("pro", "users")).toBe(3);
    expect(getPlanLimit("pro", "products")).toBe(5000);
    expect(getPlanLimit("pro", "aiMessagesMonthly")).toBe(500);
    expect(getPlanLimit("pro", "storageMb")).toBe(10240);
    expect(hasPlanFeature("pro", "advancedFinance")).toBe(true);
    expect(hasPlanFeature("pro", "automations")).toBe(true);
  });

  it("prevents exceeding a quantity limit", () => {
    expect(canUseQuantity("starter", "products", 499)).toBe(false);
    expect(canUseQuantity("starter", "products", 498)).toBe(true);
    expect(canUseQuantity("pro", "users", 2)).toBe(true);
    expect(canUseQuantity("pro", "users", 3)).toBe(false);
  });
});
