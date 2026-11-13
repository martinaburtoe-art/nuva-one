import { describe, expect, it } from "vitest";
import {
  getIndustryProfile,
  getIndustryProfilesByCore,
  INDUSTRY_PROFILES,
  searchIndustryProfiles,
} from "@/lib/industry-profiles";

describe("Nüva Chilean industry profiles", () => {
  it("has unique stable identifiers and a general fallback", () => {
    const ids = INDUSTRY_PROFILES.map((profile) => profile.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getIndustryProfile("general_business")).toBeDefined();
  });

  it("covers the high-priority Chilean commerce profiles", () => {
    expect(getIndustryProfile("hardware_store")?.activation).toBe("priority_0");
    expect(getIndustryProfile("neighborhood_grocery")?.activation).toBe("priority_0");
    expect(getIndustryProfile("wholesale_distribution")?.activation).toBe("priority_0");
  });

  it("models hardware products with variants, fractional units and conversions", () => {
    const profile = getIndustryProfile("hardware_store");
    expect(profile?.capabilities).toEqual(expect.arrayContaining([
      "product_variants",
      "fractional_units",
      "unit_conversions",
      "quotes",
    ]));
    expect(profile?.suggestedUnits).toEqual(expect.arrayContaining(["m", "m²", "kg", "barra"]));
  });

  it("models grocery expiry and barcode workflows", () => {
    const profile = getIndustryProfile("neighborhood_grocery");
    expect(profile?.capabilities).toEqual(expect.arrayContaining(["barcode", "lots_expiry", "cash_register"]));
  });

  it("groups profiles by the existing core industry enum", () => {
    expect(getIndustryProfilesByCore("retail").length).toBeGreaterThan(5);
    expect(getIndustryProfilesByCore("food").map((profile) => profile.id)).toContain("restaurant_cafe");
  });

  it("searches common Spanish names and examples", () => {
    expect(searchIndustryProfiles("ferretería").map((profile) => profile.id)).toContain("hardware_store");
    expect(searchIndustryProfiles("minimarket").map((profile) => profile.id)).toContain("neighborhood_grocery");
    expect(searchIndustryProfiles("mecánico").map((profile) => profile.id)).toContain("auto_repair_parts");
  });

  it("returns all profiles for an empty query", () => {
    expect(searchIndustryProfiles("")).toHaveLength(INDUSTRY_PROFILES.length);
  });
});
