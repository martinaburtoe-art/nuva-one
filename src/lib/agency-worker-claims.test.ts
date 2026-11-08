import { describe, expect, it } from "vitest";
import { isGeneralAgencyClaimEnabled } from "../../supabase/functions/nuva-agency-worker-control/worker-claims";

describe("Agency global queue claim gate", () => {
  it("is disabled when the environment variable is absent", () => {
    expect(isGeneralAgencyClaimEnabled(undefined)).toBe(false);
  });

  it("accepts only the exact string true", () => {
    expect(isGeneralAgencyClaimEnabled("true")).toBe(true);
    expect(isGeneralAgencyClaimEnabled("false")).toBe(false);
    expect(isGeneralAgencyClaimEnabled("TRUE")).toBe(false);
    expect(isGeneralAgencyClaimEnabled("1")).toBe(false);
    expect(isGeneralAgencyClaimEnabled("")).toBe(false);
  });
});
