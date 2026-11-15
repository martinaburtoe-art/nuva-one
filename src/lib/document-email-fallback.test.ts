import { describe, expect, it } from "vitest";
import { buildQuoteMailtoUrl } from "./document-email-fallback";

describe("buildQuoteMailtoUrl", () => {
  it("prepares a client email with the secure quote link and expiry", () => {
    const result = buildQuoteMailtoUrl({
      recipient: "cliente@example.cl",
      quoteNumber: 42,
      customerName: "Comercial Ñuble",
      totalLabel: "$119.000",
      shareUrl: "https://nuva-one.vercel.app/quote/opaque-token",
      expiresAt: "2026-11-22T10:00:00.000Z",
    });
    const parsed = new URL(result);

    expect(parsed.protocol).toBe("mailto:");
    expect(parsed.pathname).toBe("cliente@example.cl");
    expect(parsed.searchParams.get("subject")).toContain("COT-0042");
    expect(parsed.searchParams.get("body")).toContain("https://nuva-one.vercel.app/quote/opaque-token");
    expect(parsed.searchParams.get("body")).toContain("$119.000");
    expect(parsed.searchParams.get("body")).toContain("vence");
  });

  it("does not invent a quote number when the source has none", () => {
    const result = buildQuoteMailtoUrl({
      recipient: "cliente@example.cl",
      quoteNumber: null,
      customerName: "Cliente",
      totalLabel: "$10.000",
      shareUrl: "https://example.cl/quote/token",
      expiresAt: "2026-11-22T10:00:00.000Z",
    });

    expect(result).toContain("COT-");
  });
});
