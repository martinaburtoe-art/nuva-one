import { describe, expect, it } from "vitest";
import { classifyScannerCode, isValidProductCode, normalizeScannerCode, validateScannedCode } from "./scanner-code-validation";

describe("scanner code validation", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeScannerCode("  ab-123  ")).toBe("AB-123");
  });

  it("accepts a valid EAN-13", () => {
    expect(classifyScannerCode("4006381333931")).toEqual({ value: "4006381333931", kind: "EAN-13", validChecksum: true });
    expect(isValidProductCode("4006381333931")).toBe(true);
    expect(validateScannedCode("4006381333931")).toEqual({ kind: "valid", value: "4006381333931", codeKind: "EAN-13" });
  });

  it("rejects an invalid EAN-13 checksum", () => {
    expect(classifyScannerCode("4006381333932").validChecksum).toBe(false);
    expect(isValidProductCode("4006381333932")).toBe(false);
    expect(validateScannedCode("4006381333932").kind).toBe("invalid");
  });

  it("accepts an internal SKU without requiring a barcode checksum", () => {
    expect(classifyScannerCode(" sku-001 ")).toEqual({ value: "SKU-001", kind: "SKU", validChecksum: true });
    expect(isValidProductCode("sku-001")).toBe(true);
    expect(validateScannedCode("sku-001")).toEqual({ kind: "valid", value: "SKU-001", codeKind: "SKU" });
  });

  it("rejects malformed identifiers", () => {
    expect(classifyScannerCode("***").kind).toBe("UNKNOWN");
    expect(isValidProductCode("***")).toBe(false);
    expect(validateScannedCode("***").kind).toBe("invalid");
  });
});
