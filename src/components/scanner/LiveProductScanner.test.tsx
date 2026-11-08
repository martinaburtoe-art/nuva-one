import { describe, expect, it } from "vitest";
import { LiveScanner } from "@/lib/live-scanner";
import { normalizeProductCode } from "@/lib/product-resolver";
import { validateScannedCode } from "@/lib/scanner-code-validation";

describe("LiveProductScanner integration contracts", () => {
  it("normalizes live scanner codes without changing significant characters", () => {
    expect(normalizeProductCode("  780 123 456 7890  ")).toBe("7801234567890");
    expect(normalizeProductCode("SKU-ABC 001")).toBe("SKU-ABC001");
  });

  it("rejects blank product codes before database resolution", () => {
    expect(normalizeProductCode("   ")).toBe("");
  });

  it("validates real EAN checksums and rejects malformed product codes", () => {
    expect(validateScannedCode("7801234567894")).toMatchObject({
      kind: "valid",
      codeKind: "EAN-13",
    });
    expect(validateScannedCode("7801234567891")).toMatchObject({
      kind: "invalid",
    });
    expect(validateScannedCode("not a barcode!")).toMatchObject({
      kind: "invalid",
    });
  });

  it("advertises the barcode formats supported by the unified scan engine", () => {
    expect(LiveScanner.supportedFormats()).toEqual(
      expect.arrayContaining([
        "ean_13",
        "ean_8",
        "upc_a",
        "upc_e",
        "code_128",
        "code_39",
        "itf",
        "qr_code",
        "data_matrix",
        "aztec",
        "pdf417",
      ]),
    );
  });

  it("keeps the supported format list free of duplicates", () => {
    const formats = LiveScanner.supportedFormats();
    expect(new Set(formats).size).toBe(formats.length);
  });
});
