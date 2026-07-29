import { describe, it, expect } from "vitest";
import { normalizeWhatsAppNumber, isPlausiblePhoneNumber } from "./phone";

describe("normalizeWhatsAppNumber", () => {
  it("strips +, spaces, and punctuation down to digits only", () => {
    expect(normalizeWhatsAppNumber("+56 9 1234 5678")).toBe("56912345678");
  });

  it("leaves an already digits-only number unchanged", () => {
    expect(normalizeWhatsAppNumber("56912345678")).toBe("56912345678");
  });

  it("handles dashes and parentheses", () => {
    expect(normalizeWhatsAppNumber("(56) 9-1234-5678")).toBe("56912345678");
  });
});

describe("isPlausiblePhoneNumber", () => {
  it("accepts a full Chilean mobile number with country code", () => {
    expect(isPlausiblePhoneNumber("+56 9 1234 5678")).toBe(true);
  });

  it("rejects too few digits", () => {
    expect(isPlausiblePhoneNumber("12345")).toBe(false);
  });

  it("rejects unreasonably long input", () => {
    expect(isPlausiblePhoneNumber("123456789012345678")).toBe(false);
  });
});
