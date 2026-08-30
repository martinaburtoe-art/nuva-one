import crypto from "node:crypto";

type MercadoPagoConfig = {
  accessToken: string;
  environment: "test" | "prod";
};

type MercadoPagoJson = Record<string, unknown>;

export type MercadoPagoPlanId = "starter" | "pro";

const API_BASE = "https://api.mercadopago.com";
const PLAN_REFERENCE_SEPARATOR = "|plan=";
const WEBHOOK_MAX_AGE_SECONDS = 5 * 60;

export function getMercadoPagoConfig(): MercadoPagoConfig | null {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return null;
  return {
    accessToken,
    environment: process.env.MERCADOPAGO_ENV === "prod" ? "prod" : "test",
  };
}

async function mpFetch(
  config: MercadoPagoConfig,
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; json: MercadoPagoJson }> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const parsed: unknown = await response.json().catch(() => ({}));
    const json: MercadoPagoJson =
      parsed && typeof parsed === "object" ? (parsed as MercadoPagoJson) : {};
    return { ok: response.ok, status: response.status, json };
  } catch {
    return { ok: false, status: 0, json: {} };
  }
}

export function encodeMercadoPagoExternalReference(
  businessId: string,
  planId: MercadoPagoPlanId,
) {
  return `${businessId}${PLAN_REFERENCE_SEPARATOR}${planId}`;
}

export function parseMercadoPagoExternalReference(reference: string | null | undefined): {
  businessId: string;
  planId: MercadoPagoPlanId | null;
} {
  const raw = String(reference ?? "");
  const separatorIndex = raw.indexOf(PLAN_REFERENCE_SEPARATOR);
  if (separatorIndex === -1) return { businessId: raw, planId: null };

  const businessId = raw.slice(0, separatorIndex);
  const plan = raw.slice(separatorIndex + PLAN_REFERENCE_SEPARATOR.length);
  const planId = plan === "starter" || plan === "pro" ? plan : null;
  return { businessId, planId };
}

export function validateMercadoPagoWebhookSignature(params: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string | undefined;
}) {
  if (!params.signature || !params.secret) return false;
  const parts = Object.fromEntries(
    params.signature.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  ) as Record<string, string>;
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const timestampSeconds = Number(ts);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > WEBHOOK_MAX_AGE_SECONDS
  ) {
    return false;
  }

  const manifestParts: string[] = [];
  if (params.dataId) manifestParts.push(`id:${params.dataId};`);
  if (params.requestId) manifestParts.push(`request-id:${params.requestId};`);
  manifestParts.push(`ts:${ts};`);
  const manifest = manifestParts.join("");
  const expected = crypto
    .createHmac("sha256", params.secret)
    .update(manifest)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(v1, "hex");
  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export async function createMercadoPagoSubscription(params: {
  config: MercadoPagoConfig;
  businessId: string;
  businessName: string;
  email: string;
  planName: string;
  planId: MercadoPagoPlanId;
  amount: number;
  billing: "monthly" | "annual";
  backUrl: string;
}) {
  const recurring = {
    frequency: params.billing === "annual" ? 12 : 1,
    frequency_type: "months",
    transaction_amount: Math.round(params.amount),
    currency_id: "CLP",
  };

  const result = await mpFetch(params.config, "/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: `${params.planName} — Nüva One`,
      external_reference: encodeMercadoPagoExternalReference(params.businessId, params.planId),
      payer_email: params.email,
      auto_recurring: recurring,
      back_url: params.backUrl,
      status: "pending",
    }),
  });

  if (!result.ok || !result.json?.id || !result.json?.init_point) {
    return {
      ok: false as const,
      errorMessage:
        typeof result.json?.message === "string"
          ? result.json.message
          : "Mercado Pago no pudo crear la suscripción",
      preapprovalId: null,
      initPoint: null,
    };
  }

  return {
    ok: true as const,
    errorMessage: null,
    preapprovalId: String(result.json.id),
    initPoint: String(result.json.init_point),
    status: String(result.json.status ?? "pending"),
  };
}

export async function getMercadoPagoSubscription(
  config: MercadoPagoConfig,
  preapprovalId: string,
) {
  const result = await mpFetch(config, `/preapproval/${encodeURIComponent(preapprovalId)}`);
  if (!result.ok || !result.json?.id) return { ok: false as const, data: null };
  return { ok: true as const, data: result.json };
}

export async function updateMercadoPagoSubscription(
  config: MercadoPagoConfig,
  preapprovalId: string,
  body: Record<string, unknown>,
) {
  const result = await mpFetch(config, `/preapproval/${encodeURIComponent(preapprovalId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return {
    ok: result.ok,
    data: result.ok ? result.json : null,
    errorMessage: typeof result.json?.message === "string" ? result.json.message : null,
  };
}

export async function getMercadoPagoPayment(config: MercadoPagoConfig, paymentId: string) {
  const result = await mpFetch(config, `/v1/payments/${encodeURIComponent(paymentId)}`);
  if (!result.ok || !result.json?.id) return { ok: false as const, data: null };
  return { ok: true as const, data: result.json };
}

export function isMercadoPagoSubscriptionActive(status: string | null | undefined) {
  return status === "authorized" || status === "active";
}
