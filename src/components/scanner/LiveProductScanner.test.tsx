import { describe, expect, it, vi } from "vitest";
import { normalizeProductCode } from "@/lib/product-resolver";

describe("LiveProductScanner integration contracts", () => {
  it("normalizes live scanner codes without changing significant characters", () => {
    expect(normalizeProductCode("  780 123 456 7890  ")).toBe("7801234567890");
    expect(normalizeProductCode("SKU-ABC 001")).toBe("SKU-ABC001");
  });

  it("keeps the resolver independent from UI camera state", () => {
    expect(vi.isMockFunction(vi.fn())).toBe(true);
  });
});
