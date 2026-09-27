import type { IntegrationContext, NuvaIntegrationAdapter } from "./nuva-integration-types";
import { constantTimeEqual, hmacSha256Base64 } from "./webhook-crypto";

function parsePayload(rawBody: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(rawBody);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function header(headers: Headers, ...names: string[]) {
  for (const name of names) {
    const value = headers.get(name);
    if (value) return value;
  }
  return "";
}

const shopify: NuvaIntegrationAdapter = {
  provider: "shopify",
  async health() { return "configuration_required"; },
  async verifyWebhook({ secret, headers, rawBody }) {
    const supplied = header(headers, "x-shopify-hmac-sha256");
    return supplied ? constantTimeEqual(await hmacSha256Base64(secret, rawBody), supplied) : false;
  },
  async normalizeWebhook({ headers, rawBody }) {
    const payload = parsePayload(rawBody);
    const eventType = header(headers, "x-shopify-topic") || "unknown";
    const externalEventId = header(headers, "x-shopify-event-id") || eventType + ":" + header(headers, "x-shopify-shop-domain") + ":" + Date.now();
    return { provider: "shopify", externalEventId, eventType, direction: "in", resourceType: eventType.split("/")[0], payload };
  },
};

const woocommerce: NuvaIntegrationAdapter = {
  provider: "woocommerce",
  async health() { return "configuration_required"; },
  async verifyWebhook({ secret, headers, rawBody }) {
    const supplied = header(headers, "x-wc-webhook-signature");
    return supplied ? constantTimeEqual(await hmacSha256Base64(secret, rawBody), supplied) : false;
  },
  async normalizeWebhook({ headers, rawBody }) {
    const payload = parsePayload(rawBody);
    const eventType = header(headers, "x-wc-webhook-topic") || "unknown";
    const externalEventId = header(headers, "x-wc-webhook-delivery-id") || eventType + ":" + Date.now();
    return { provider: "woocommerce", externalEventId, eventType, direction: "in", resourceType: header(headers, "x-wc-webhook-resource") || undefined, payload };
  },
};

export const NUVA_INTEGRATION_ADAPTERS: Record<string, NuvaIntegrationAdapter> = { shopify, woocommerce };

export function getNuvaIntegrationAdapter(provider: string) {
  return NUVA_INTEGRATION_ADAPTERS[provider];
}

export function buildIntegrationContext(connection: { id: string; business_id: string; provider: string; external_account_id?: string | null; scopes?: string[]; metadata?: Record<string, unknown> | null }): IntegrationContext {
  return {
    businessId: connection.business_id,
    connectionId: connection.id,
    provider: connection.provider,
    externalAccountId: connection.external_account_id,
    scopes: connection.scopes ?? [],
    metadata: connection.metadata ?? {},
  };
}
