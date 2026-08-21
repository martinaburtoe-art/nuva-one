import { describe, expect, it } from "vitest";
import { normalizeIntelligenceDomain } from "./nuva-domain-normalizer";

describe("intelligence domain normalizer", () => {
  it("preserves tax and compliance domains", () => {
    expect(normalizeIntelligenceDomain("tax")).toBe("tax");
    expect(normalizeIntelligenceDomain("compliance")).toBe("compliance");
  });

  it("preserves operational domains", () => {
    expect(normalizeIntelligenceDomain("cashflow")).toBe("cashflow");
    expect(normalizeIntelligenceDomain("inventory")).toBe("inventory");
  });

  it("fails closed to compliance for unknown domains", () => {
    expect(normalizeIntelligenceDomain("unknown")).toBe("compliance");
  });
});
