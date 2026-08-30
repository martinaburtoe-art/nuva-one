import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  encodeMercadoPagoExternalReference,
  parseMercadoPagoExternalReference,
  validateMercadoPagoWebhookSignature,
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

describe("Mercado Pago webhook signature", () => {
  const secret = "test-webhook-secret";

  function sign(ts: number, dataId: string, requestId: string) {
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    return crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  }

  it("accepts a valid recent signature", () => {
    const ts = Math.floor(Date.now() / 1000);
    expect(
      validateMercadoPagoWebhookSignature({
        signature: `ts=${ts},v1=${sign(ts, "123", "req-1")}`,
        requestId: "req-1",
        dataId: "123",
        secret,
      }),
    ).toBe(true);
  });

  it("rejects a stale signature to prevent webhook replay", () => {
    const ts = Math.floor(Date.now() / 1000) - 60 * 60;
    expect(
      validateMercadoPagoWebhookSignature({
        signature: `ts=${ts},v1=${sign(ts, "123", "req-1")}`,
        requestId: "req-1",
        dataId: "123",
        secret,
      }),
    ).toBe(false);
  });

  it("rejects a signature when the signed request context changes", () => {
    const ts = Math.floor(Date.now() / 1000);
    expect(
      validateMercadoPagoWebhookSignature({
        signature: `ts=${ts},v1=${sign(ts, "123", "req-1")}`,
        requestId: "req-2",
        dataId: "123",
        secret,
      }),
    ).toBe(false);
  });
});
