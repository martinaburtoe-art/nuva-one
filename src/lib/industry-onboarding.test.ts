import { describe, expect, it } from "vitest";
import { INDUSTRY_PROFILES } from "@/lib/industry-profiles";
import {
  buildIndustryOnboardingPlan,
  getIndustryOnboardingPlans,
  isIndustryCapabilityEnabled,
  buildIndustryOnboardingSelection,
} from "@/lib/industry-onboarding";

describe("industry onboarding plans", () => {
  it("builds a plan for every sector profile", () => {
    const plans = getIndustryOnboardingPlans();
    expect(plans).toHaveLength(INDUSTRY_PROFILES.length);
    expect(plans.map((plan) => plan.profile.id)).toEqual(INDUSTRY_PROFILES.map((profile) => profile.id));
  });

  it("uses a general fallback for an unknown profile without blocking signup", () => {
    const plan = buildIndustryOnboardingPlan("unknown-sector");
    expect(plan.profile.id).toBe("general_business");
    expect(plan.siiActivityCode.required).toBe(false);
  });

  it("creates stable optional questions and keeps SII activity optional", () => {
    const plan = buildIndustryOnboardingPlan("hardware_store");
    expect(plan.questions.length).toBeGreaterThan(0);
    expect(plan.questions.every((question) => question.required === false)).toBe(true);
    expect(new Set(plan.questions.map((question) => question.id)).size).toBe(plan.questions.length);
    expect(plan.siiActivityCode).toEqual({
      required: false,
      canAddMultiple: true,
      mustBeConfirmedByUser: true,
    });
  });

  it("separates enabled capabilities from planned capabilities", () => {
    const plan = buildIndustryOnboardingPlan("hardware_store");
    expect(plan.enabledCapabilities).toEqual(["barcode", "quotes", "dispatch", "cash_register"]);
    expect(plan.plannedCapabilities).toContain("product_variants");
    expect(plan.plannedCapabilities).toContain("fractional_units");
  });

  it("combines mixed business profiles without duplicating the primary profile", () => {
    const selection = buildIndustryOnboardingSelection(
      "hardware_store",
      ["neighborhood_grocery", "wholesale_distribution", "hardware_store"],
    );
    expect(selection.primary.profile.id).toBe("hardware_store");
    expect(selection.secondary.map((plan) => plan.profile.id)).toEqual([
      "neighborhood_grocery",
      "wholesale_distribution",
    ]);
    expect(selection.suggestedUnits).toContain("pallet");
    expect(selection.enabledCapabilities).toEqual(expect.arrayContaining(["barcode", "quotes", "cash_register"]));
    expect(selection.maxSecondaryProfiles).toBe(3);
    expect(selection.unknownSecondaryProfileIds).toEqual([]);
  });

  it("reports unknown and excess secondary profiles for explicit validation", () => {
    const selection = buildIndustryOnboardingSelection(
      "professional_services",
      ["hardware_store", "neighborhood_grocery", "restaurant_cafe", "auto_repair_parts", "unknown"],
    );
    expect(selection.secondary).toHaveLength(3);
    expect(selection.unknownSecondaryProfileIds).toEqual(["auto_repair_parts", "unknown"]);
  });

  it("never treats planned sector capabilities as enabled", () => {
    expect(isIndustryCapabilityEnabled("fractional_units")).toBe(false);
    expect(isIndustryCapabilityEnabled("lots_expiry")).toBe(false);
    expect(isIndustryCapabilityEnabled("barcode")).toBe(true);
  });

  it("supports primary and secondary profiles without conflating them with SII codes", () => {
    const hardware = buildIndustryOnboardingPlan("hardware_store");
    const repair = buildIndustryOnboardingPlan("auto_repair_parts");
    expect(hardware.supportsSecondaryProfile).toBe(true);
    expect(repair.supportsSecondaryProfile).toBe(true);
    expect(hardware.siiActivityCode).not.toBe(repair.siiActivityCode);
  });
});
