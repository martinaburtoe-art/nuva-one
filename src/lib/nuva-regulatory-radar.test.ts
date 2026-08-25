import { describe, expect, it } from "vitest";
import {
  calculateRegulatoryReadiness,
  getRegulatoryStatus,
  NUVA_CHILE_REGULATORY_RULES,
} from "./nuva-regulatory-radar";

describe("Nüva Chile Regulatory Radar", () => {
  it("marks the 2026 privacy regime as upcoming before its effective date", () => {
    const rule = NUVA_CHILE_REGULATORY_RULES.find((item) => item.id === "privacy-law-21719")!;
    expect(getRegulatoryStatus(rule, new Date("2026-08-20T12:00:00Z"))).toBe("upcoming");
    expect(getRegulatoryStatus(rule, new Date("2026-12-01T12:00:00Z"))).toBe("active");
  });

  it("scores implemented capabilities and exposes missing controls", () => {
    const result = calculateRegulatoryReadiness(["dte", "xml", "folios", "boleta", "credit-note"]);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    const privacy = result.results.find((item) => item.rule.id === "privacy-law-21719")!;
    expect(privacy.missing).toContain("privacy-center");
  });
});
