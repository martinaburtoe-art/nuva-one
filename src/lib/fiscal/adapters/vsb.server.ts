import type { PaymentAdapter, PaymentIntent, PaymentResult } from "../types";

// VSB no tiene un endpoint público único documentado igual que Flow, por eso
// el negocio configura su propia api_url (URL base entregada por VSB al
// contratar el servicio). Ajustar rutas/campos exactos cuando se confirme
// la documentación oficial del contrato del cliente.
export const vsbAdapter: PaymentAdapter = {
  async createPayment({ apiKey, apiUrl }, intent: PaymentIntent): Promise<PaymentResult> {
    if (!apiUrl) {
      return { ok: false, paymentUrl: null, token: null, errorMessage: "Falta api_url de VSB", raw: null };
    }
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/charges`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(intent.amount),
          currency: "CLP",
          reference: intent.commerceOrder,
          description: intent.subject,
          return_url: intent.returnUrl,
          webhook_url: intent.webhookUrl,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.payment_url) {
        return { ok: false, paymentUrl: null, token: null, errorMessage: json?.message || "Error creando pago en VSB", raw: json };
      }
      return { ok: true, paymentUrl: json.payment_url, token: json.id ?? null, errorMessage: null, raw: json };
    } catch {
      return { ok: false, paymentUrl: null, token: null, errorMessage: "No se pudo contactar a VSB", raw: null };
    }
  },
};
