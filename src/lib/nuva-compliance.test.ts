import { describe, expect, it } from "vitest";
import {
  CHILE_COMPLIANCE_REGISTRY,
  getChileComplianceRadar,
  getUpcomingChileCompliance,
} from "./nuva-compliance";

describe("Nüva Chile compliance radar", () => {
  it("contains the critical SII certification control", () => {
    const item = CHILE_COMPLIANCE_REGISTRY.find((entry) => entry.id === "sii-market-certification");
    expect(item?.authority).toBe("SII");
    expect(item?.severity).toBe("critical");
    expect(item?.status).toBe("required");
  });

  it("surfaces the 2026 privacy-law preparation milestone", () => {
    const upcoming = getUpcomingChileCompliance(new Date("2026-08-20T12:00:00"), 180);
    expect(upcoming.some((entry) => entry.id === "privacy-law-21719")).toBe(true);
  });

  it("prioritizes critical controls in the radar", () => {
    const radar = getChileComplianceRadar(new Date("2026-08-20T12:00:00"));
    expect(radar[0].severity).toBe("critical");
  });
});
