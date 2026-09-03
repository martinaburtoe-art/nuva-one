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

describe("Mercado Pago webhook signature validation", () => {
  const secret = "test-webhook-secret";
  const requestId = "req-123";
  const dataId = "pay-456";
  const nowSeconds = 1_700_000_000;

  function signatureFor(timestamp: number) {
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    return `ts=${timestamp},v1=${crypto.createHmac("sha256", secret).update(manifest).digest("hex")}`;
  }

  it("accepts a valid current signature", () => {
    expect(
      validateMercadoPagoWebhookSignature({
        signature: signatureFor(nowSeconds),
        requestId,
        dataId,
        secret,
        nowSeconds,
      }),
    ).toBe(true);
  });

  it("rejects a replayed signature outside the freshness window", () => {
    expect(
      validateMercadoPagoWebhookSignature({
        signature: signatureFor(nowSeconds - 301),
        requestId,
        dataId,
        secret,
        nowSeconds,
      }),
    ).toBe(false);
  });

  it("rejects malformed signatures before timing-safe comparison", () => {
    expect(
      validateMercadoPagoWebhookSignature({
        signature: `ts=${nowSeconds},v1=not-hex`,
        requestId,
        dataId,
        secret,
        nowSeconds,
      }),
    ).toBe(false);
  });

  it("rejects a missing webhook secret", () => {
    expect(
      validateMercadoPagoWebhookSignature({
        signature: signatureFor(nowSeconds),
        requestId,
        dataId,
        secret: undefined,
        nowSeconds,
      }),
    ).toBe(false);
  });
});
