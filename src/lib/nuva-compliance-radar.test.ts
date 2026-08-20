import { describe, expect, it } from "vitest";
import { getComplianceRadar, getUpcomingCompliance } from "./nuva-compliance-radar";

describe("Nüva Chile compliance radar", () => {
  it("marks current Chile rules active and future rules upcoming", () => {
    const radar = getComplianceRadar(new Date("2026-08-20T12:00:00"));
    expect(radar.find((rule) => rule.id === "labor-42-hours-2026")?.status).toBe("active");
    expect(radar.find((rule) => rule.id === "privacy-law-21719-2026")?.status).toBe("upcoming");
  });

  it("surfaces the privacy law before its effective date", () => {
    const upcoming = getUpcomingCompliance(120, new Date("2026-08-20T12:00:00"));
    expect(upcoming.map((rule) => rule.id)).toContain("privacy-law-21719-2026");
  });

  it("keeps every rule source-linked and actionable", () => {
    for (const rule of getComplianceRadar(new Date("2026-08-20T12:00:00"))) {
      expect(rule.source.startsWith("https://")).toBe(true);
      expect(rule.action.length).toBeGreaterThan(10);
    }
  });
});
