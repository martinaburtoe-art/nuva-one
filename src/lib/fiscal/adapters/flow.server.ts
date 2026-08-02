import crypto from "node:crypto";
import type { PaymentAdapter, PaymentIntent, PaymentResult } from "../types";

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

export const flowAdapter: PaymentAdapter = {
  async createPayment({ apiKey, secretKey, environment }, intent: PaymentIntent): Promise<PaymentResult> {
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
        return { ok: false, paymentUrl: null, token: null, errorMessage: json?.message || "Error creando pago en Flow", raw: json };
      }
      return { ok: true, paymentUrl: `${json.url}?token=${json.token}`, token: json.token, errorMessage: null, raw: json };
    } catch {
      return { ok: false, paymentUrl: null, token: null, errorMessage: "No se pudo contactar a Flow", raw: null };
    }
  },
};
