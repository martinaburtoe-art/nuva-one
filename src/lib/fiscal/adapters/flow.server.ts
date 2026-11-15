import crypto from "node:crypto";
import type { PaymentAdapter, PaymentIntent, PaymentResult, PaymentStatusResult } from "../types";

function baseUrl(environment: string): string {
  return environment === "prod" ? "https://www.flow.cl/api" : "https://sandbox.flow.cl/api";
}

// Flow firma cada request: concatena params ordenados alfabéticamente y
// calcula HMAC-SHA256 con el secretKey del comercio.
function sign(params: Record<string, string>, secretKey: string): string {
  const ordered = Object.keys(params).sort();
  const toSign = ordered.map((k) => `${k}${params[k]}`).join("");
  return crypto.createHmac("sha256", secretKey).update(toSign).digest("hex");
}

// Códigos de estado documentados por Flow (GET /payment/getStatus):
// 1 = pendiente, 2 = pagada, 3 = rechazada, 4 = anulada.
const FLOW_STATUS: Record<number, PaymentStatusResult["status"]> = {
  1: "pending",
  2: "paid",
  3: "rejected",
  4: "rejected",
};

export const flowAdapter: PaymentAdapter = {
  async createPayment(
    { apiKey, secretKey, environment },
    intent: PaymentIntent,
  ): Promise<PaymentResult> {
    const params: Record<string, string> = {
      apiKey,
      commerceOrder: intent.commerceOrder,
      subject: intent.subject.slice(0, 100),
      currency: "CLP",
      amount: String(Math.round(intent.amount)),
      email: intent.email || "cliente@nuvaone.cl",
      urlConfirmation: intent.webhookUrl,
      urlReturn: intent.returnUrl,
    };
    params.s = sign(params, secretKey);

    try {
      const res = await fetch(`${baseUrl(environment)}/payment/create`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params).toString(),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url || !json?.token) {
        return {
          ok: false,
          paymentUrl: null,
          token: null,
          errorMessage: json?.message || "Error creando pago en Flow",
          raw: json,
        };
      }
      return {
        ok: true,
        paymentUrl: `${json.url}?token=${json.token}`,
        token: json.token,
        errorMessage: null,
        raw: json,
      };
    } catch {
      return {
        ok: false,
        paymentUrl: null,
        token: null,
        errorMessage: "No se pudo contactar a Flow",
        raw: null,
      };
    }
  },

  // Verificación server-to-server obligatoria antes de marcar un pago como
  // confirmado: nunca confiar en el POST recibido en el webhook por sí solo.
  async checkStatus({ apiKey, secretKey, environment }, token): Promise<PaymentStatusResult> {
    const params: Record<string, string> = { apiKey, token };
    params.s = sign(params, secretKey);
    try {
      const res = await fetch(
        `${baseUrl(environment)}/payment/getStatus?${new URLSearchParams(params).toString()}`,
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        return { ok: false, status: "unknown", commerceOrder: null, amount: null, raw: json };
      const status = FLOW_STATUS[Number(json?.status)] ?? "unknown";
      return {
        ok: true,
        status,
        commerceOrder: json?.commerceOrder ?? null,
        amount: json?.amount != null ? Number(json.amount) : null,
        raw: json,
      };
    } catch {
      return { ok: false, status: "unknown", commerceOrder: null, amount: null, raw: null };
    }
  },
};

/**
 * Read-only credential check. Queries the merchant's payment list for today
 * (one row maximum), so connecting Flow never creates a charge or checkout.
 */
export async function validateFlowCredentials(
  credentials: { apiKey: string; secretKey: string; environment: string },
): Promise<{ ok: boolean; message?: string }> {
  const params: Record<string, string> = {
    apiKey: credentials.apiKey,
    date: new Date().toISOString().slice(0, 10),
    start: "0",
    limit: "1",
  };
  params.s = sign(params, credentials.secretKey);
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(baseUrl(credentials.environment) + "/payment/getPayments?" + query, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload?.code == null && payload?.total != null && payload?.data != null) {
      return { ok: true };
    }
    return {
      ok: false,
      message: response.status === 401 || payload?.code != null
        ? "Flow rechazó las credenciales. Revisa API Key, Secret Key y ambiente."
        : "Flow no pudo validar las credenciales. Comprueba que correspondan al ambiente seleccionado.",
    };
  } catch {
    return { ok: false, message: "No se pudo conectar con Flow para validar las credenciales." };
  }
}
