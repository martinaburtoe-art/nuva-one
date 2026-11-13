import { describe, expect, it } from "vitest";
import { INDUSTRY_PROFILES } from "@/lib/industry-profiles";
import {
  getAvailableIndustryCapabilities,
  getCapabilityReadiness,
  INDUSTRY_CAPABILITY_READINESS,
} from "@/lib/industry-capability-readiness";

describe("industry capability release gates", () => {
  it("has an explicit readiness state and evidence for every capability", () => {
    for (const [capability, readiness] of Object.entries(INDUSTRY_CAPABILITY_READINESS)) {
      expect(readiness.status).toMatch(/^(available|pilot|planned)$/);
      expect(readiness.evidence.trim().length, capability).toBeGreaterThan(20);
    }
  });

  it("has readiness coverage for every capability referenced by every profile", () => {
    const referenced = new Set(INDUSTRY_PROFILES.flatMap((profile) => profile.capabilities));
    const registered = new Set(Object.keys(INDUSTRY_CAPABILITY_READINESS));
    expect([...referenced].filter((capability) => !registered.has(capability)).sort()).toEqual([]);
  });

  it("only exposes capabilities backed by current product workflows", () => {
    const available = Object.entries(INDUSTRY_CAPABILITY_READINESS)
      .filter(([, readiness]) => readiness.status === "available")
      .map(([capability]) => capability)
      .sort();
    expect(available).toEqual(["barcode", "cash_register", "customer_history", "dispatch", "quotes"]);
  });

  it("filters planned capabilities from the enabled list", () => {
    const hardware = INDUSTRY_PROFILES.find((profile) => profile.id === "hardware_store");
    expect(hardware).toBeDefined();
    expect(getAvailableIndustryCapabilities(hardware!.capabilities)).toEqual([
      "barcode",
      "quotes",
      "dispatch",
      "cash_register",
    ]);
  });

  it("does not expose any planned capability as enabled for the grocery pack", () => {
    const grocery = INDUSTRY_PROFILES.find((profile) => profile.id === "neighborhood_grocery");
    expect(grocery).toBeDefined();
    expect(getAvailableIndustryCapabilities(grocery!.capabilities)).toEqual([
      "barcode",
      "cash_register",
    ]);
  });

  it("does not treat fractional movement records as end-to-end fractional stock", () => {
    expect(getCapabilityReadiness("fractional_units").status).toBe("planned");
  });
});
