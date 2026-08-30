import { describe, expect, it } from "vitest";
import {
  encodeMercadoPagoExternalReference,
  parseMercadoPagoExternalReference,
} from "./mercadopago-subscriptions.server";

describe("Mercado Pago subscription plan reference", () => {
  it("encodes Starter in the preapproval external reference", () => {
    expect(encodeMercadoPagoExternalReference("biz-123", "starter")).toBe("biz-123|plan=starter");
  });

  it("encodes Pro in the preapproval external reference", () => {
    expect(encodeMercadoPagoExternalReference("biz-123", "pro")).toBe("biz-123|plan=pro");
  });

  it("round-trips Starter without losing the business id", () => {
    expect(parseMercadoPagoExternalReference("biz-123|plan=starter")).toEqual({
      businessId: "biz-123",
      planId: "starter",
    });
  });

  it("round-trips Pro without losing the business id", () => {
    expect(parseMercadoPagoExternalReference("biz-123|plan=pro")).toEqual({
      businessId: "biz-123",
      planId: "pro",
    });
  });

  it("keeps legacy references compatible and does not invent Pro", () => {
    expect(parseMercadoPagoExternalReference("biz-legacy")).toEqual({
      businessId: "biz-legacy",
      planId: null,
    });
  });

  it("rejects an unknown plan marker", () => {
    expect(parseMercadoPagoExternalReference("biz-123|plan=enterprise")).toEqual({
      businessId: "biz-123",
      planId: null,
    });
  });
});
