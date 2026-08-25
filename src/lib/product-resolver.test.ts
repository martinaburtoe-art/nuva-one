import { describe, expect, it } from "vitest";
import { normalizeProductCode } from "./product-resolver";

describe("product resolver", () => {
  it("normalizes scanner and keyboard input consistently", () => {
    expect(normalizeProductCode("  780 123 456 7890  ")).toBe("7801234567890");
    expect(normalizeProductCode("\nSKU-001\t")).toBe("SKU-001");
  });

  it("does not invent a code for empty input", () => {
    expect(normalizeProductCode("   ")).toBe("");
  });
});
