import { describe, expect, it } from "vitest";
import { classifyScannerCode, isValidProductCode, normalizeScannerCode } from "./scanner-code-validation";

describe("scanner code validation", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeScannerCode("  ab-123  ")).toBe("AB-123");
  });

  it("accepts a valid EAN-13", () => {
    expect(classifyScannerCode("4006381333931")).toEqual({ value: "4006381333931", kind: "EAN-13", validChecksum: true });
    expect(isValidProductCode("4006381333931")).toBe(true);
  });

  it("rejects an invalid EAN-13 checksum", () => {
    expect(classifyScannerCode("4006381333932").validChecksum).toBe(false);
    expect(isValidProductCode("4006381333932")).toBe(false);
  });

  it("accepts an internal SKU without requiring a barcode checksum", () => {
    expect(classifyScannerCode(" sku-001 ")).toEqual({ value: "SKU-001", kind: "SKU", validChecksum: true });
    expect(isValidProductCode("sku-001")).toBe(true);
  });

  it("rejects malformed identifiers", () => {
    expect(classifyScannerCode("***").kind).toBe("UNKNOWN");
    expect(isValidProductCode("***")).toBe(false);
  });
});
