import { describe, expect, it } from "vitest";
import { shouldAcceptScannerDetection } from "./scanner-detection-guard";

const base = {
  code: "7801234567894",
  lastHandledCode: "",
  inFlight: false,
  operationOpen: false,
  newProductOpen: false,
};

describe("scanner detection guard", () => {
  it("accepts a new non-empty code when the scanner is idle", () => {
    expect(shouldAcceptScannerDetection(base)).toBe(true);
  });

  it("rejects blank and duplicate codes", () => {
    expect(shouldAcceptScannerDetection({ ...base, code: "   " })).toBe(false);
    expect(shouldAcceptScannerDetection({ ...base, lastHandledCode: base.code })).toBe(false);
  });

  it("rejects overlapping resolutions", () => {
    expect(shouldAcceptScannerDetection({ ...base, inFlight: true })).toBe(false);
  });

  it("does not scan over an active inventory operation", () => {
    expect(shouldAcceptScannerDetection({ ...base, operationOpen: true })).toBe(false);
  });

  it("does not scan over the new-product form", () => {
    expect(shouldAcceptScannerDetection({ ...base, newProductOpen: true })).toBe(false);
  });
});
