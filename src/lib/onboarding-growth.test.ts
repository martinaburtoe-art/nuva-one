import { describe, expect, it } from "vitest";
import {
  getOnboardingGoalConfig,
  validateOnboardingInput,
  calculateActivationProgress,
  ONBOARDING_GOALS,
} from "./onboarding-growth";

describe("onboarding-growth utility", () => {
  it("returns correct goal config for valid goals", () => {
    expect(getOnboardingGoalConfig("inventory")).toEqual(ONBOARDING_GOALS.inventory);
    expect(getOnboardingGoalConfig("finance")).toEqual(ONBOARDING_GOALS.finance);
  });

  it("falls back to sales goal for invalid or missing goal", () => {
    expect(getOnboardingGoalConfig("unknown")).toEqual(ONBOARDING_GOALS.sales);
    expect(getOnboardingGoalConfig(null)).toEqual(ONBOARDING_GOALS.sales);
  });

  it("validates valid onboarding input correctly", () => {
    const result = validateOnboardingInput({
      name: "Boutique Central",
      industry: "retail",
      size: "1-5",
      goal: "sales",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects blank or short business names", () => {
    const blank = validateOnboardingInput({ name: "   ", industry: "retail", size: "solo", goal: "sales" });
    expect(blank.valid).toBe(false);
    expect(blank.errors[0]).toContain("obligatorio");

    const short = validateOnboardingInput({ name: "A", industry: "retail", size: "solo", goal: "sales" });
    expect(short.valid).toBe(false);
    expect(short.errors[0]).toContain("al menos 2 caracteres");
  });

  it("rejects invalid goal", () => {
    const result = validateOnboardingInput({
      name: "Mi Negocio",
      industry: "retail",
      size: "1-5",
      goal: "invalid-goal",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("foco inicial"))).toBe(true);
  });

  it("calculates activation progress percentage correctly", () => {
    expect(calculateActivationProgress([])).toBe(0);
    expect(calculateActivationProgress(["step1"])).toBe(25);
    expect(calculateActivationProgress(["step1", "step2", "step3", "step4"])).toBe(100);
    expect(calculateActivationProgress(["a", "b", "c", "d", "e"])).toBe(100);
  });
});
