import { describe, it, expect } from "vitest";
import { validateMercadoPagoWebhookSignature } from "./mercadopago-subscriptions.server";
import crypto from "node:crypto";

describe("validateMercadoPagoWebhookSignature (T-35)", () => {
  const secret = "test-mp-secret";
  const dataId = "data-123";
  const requestId = "req-456";
  const ts = "1700000000";

  function makeSignature(secret: string, dataId: string, requestId: string, ts: string): string {
    const manifestParts: string[] = [];
    if (dataId) manifestParts.push(`id:${dataId};`);
    if (requestId) manifestParts.push(`request-id:${requestId};`);
    manifestParts.push(`ts:${ts};`);
    const manifest = manifestParts.join("");
    return crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  }

  it("retorna true con firma válida (id + request-id + ts)", () => {
    const v1 = makeSignature(secret, dataId, requestId, ts);
    const signature = `ts=${ts},v1=${v1}`;
    expect(
      validateMercadoPagoWebhookSignature({ signature, requestId, dataId, secret }),
    ).toBe(true);
  });

  it("retorna true con firma válida (solo ts, sin id ni request-id)", () => {
    const v1 = makeSignature(secret, "", "", ts);
    const signature = `ts=${ts},v1=${v1}`;
    expect(
      validateMercadoPagoWebhookSignature({ signature, requestId: null, dataId: null, secret }),
    ).toBe(true);
  });

  it("retorna false con firma inválida", () => {
    const v1 = makeSignature(secret, dataId, requestId, ts);
    const badSignature = `ts=${ts},v1=${"0".repeat(64)}`;
    expect(
      validateMercadoPagoWebhookSignature({ signature: badSignature, requestId, dataId, secret }),
    ).toBe(false);
  });

  it("retorna false sin signature", () => {
    expect(
      validateMercadoPagoWebhookSignature({
        signature: null,
        requestId,
        dataId,
        secret,
      }),
    ).toBe(false);
  });

  it("retorna false sin secret", () => {
    const v1 = makeSignature(secret, dataId, requestId, ts);
    const signature = `ts=${ts},v1=${v1}`;
    expect(
      validateMercadoPagoWebhookSignature({ signature, requestId, dataId, secret: undefined }),
    ).toBe(false);
  });

  it("retorna false con ts faltante en la firma", () => {
    const signature = `v1=${makeSignature(secret, dataId, requestId, "")}`;
    expect(
      validateMercadoPagoWebhookSignature({ signature, requestId, dataId, secret }),
    ).toBe(false);
  });
});
