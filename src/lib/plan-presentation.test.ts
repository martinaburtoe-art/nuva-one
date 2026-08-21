import { describe, expect, it } from "vitest";
import { NUVA_PLAN_PRESENTATIONS, getPlanPresentation } from "./plan-presentation";

describe("plan presentation", () => {
  it("derives Start pricing and limits from the central plan config", () => {
    const plan = getPlanPresentation("starter");
    expect(plan.monthlyPrice).toContain("11.990");
    expect(plan.annualPrice).toContain("119.900");
    expect(plan.includedUsersLabel).toBe("1 usuario");
    expect(plan.productsLabel).toContain("500");
    expect(plan.aiLabel).toContain("100");
    expect(plan.storageLabel).toBe("2 GB");
  });

  it("derives Pro pricing and limits from the central plan config", () => {
    const plan = getPlanPresentation("pro");
    expect(plan.monthlyPrice).toContain("27.990");
    expect(plan.annualPrice).toContain("279.900");
    expect(plan.includedUsersLabel).toBe("3 usuarios");
    expect(plan.productsLabel).toContain("5.000");
    expect(plan.aiLabel).toContain("500");
    expect(plan.storageLabel).toBe("10 GB");
    expect(plan.highlights).toContain("Nüva Radar y Nüva Copilot");
  });

  it("calculates annual savings from the configured prices", () => {
    expect(NUVA_PLAN_PRESENTATIONS.starter.annualSavings).toContain("23.980");
    expect(NUVA_PLAN_PRESENTATIONS.pro.annualSavings).toContain("55.980");
  });
});
