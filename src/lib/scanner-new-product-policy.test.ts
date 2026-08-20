import { describe, expect, it } from "vitest";
import { decideUnknownCode } from "./scanner-new-product-policy";

describe("decideUnknownCode", () => {
  it("normalizes a valid EAN before onboarding", () => {
    const result = decideUnknownCode(" 4006381333931 ");
    expect(result).toEqual({ kind: "create", code: "4006381333931", codeKind: "EAN-13" });
  });

  it("rejects a malformed code", () => {
    expect(decideUnknownCode("not a barcode").kind).toBe("invalid");
  });

  it("accepts an internal SKU", () => {
    expect(decideUnknownCode("SKU-ABC-01")).toEqual({ kind: "create", code: "SKU-ABC-01", codeKind: "SKU" });
  });

  it("rejects an invalid barcode checksum", () => {
    expect(decideUnknownCode("4006381333932").kind).toBe("invalid");
  });
});
