import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { getPaymentAdapter, decryptPaymentCreds } from "@/lib/fiscal/payment-service.server";

export const Route = createFileRoute("/api/billing/payments/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        const amount = Number(body.amount);
        const subject = String(body.subject || "Pago Nüva One");
        const saleId = body.sale_id ? String(body.sale_id) : null;
        if (!businessId || !amount) {
          return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
        }

        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        const { data: integration } = await client
          .from("billing_integrations" as any)
          .select("*")
          .eq("business_id", businessId)
          .eq("type", "payment")
          .eq("status", "connected")
          .maybeSingle();
        if (!integration) {
          return new Response(JSON.stringify({ error: "No hay pasarela de pago conectada" }), { status: 404 });
        }

        const adapter = getPaymentAdapter((integration as any).provider);
        if (!adapter) return new Response(JSON.stringify({ error: "Proveedor de pago no soportado" }), { status: 400 });

        const { apiKey, secretKey } = decryptPaymentCreds(integration as any);
        const origin = new URL(request.url).origin;
        const commerceOrder = saleId ? `sale-${saleId}` : `order-${crypto.randomUUID()}`;

        const result = await adapter.createPayment(
          { apiKey, secretKey, apiUrl: (integration as any).api_url || "", environment: (integration as any).environment },
          {
            amount,
            subject,
            commerceOrder,
            returnUrl: `${origin}/ventas?payment=${commerceOrder}`,
            webhookUrl: `${origin}/api/billing/payments/webhook?provider=${(integration as any).provider}`,
          },
        );

        if (!result.ok) return new Response(JSON.stringify({ error: result.errorMessage }), { status: 502 });
        return new Response(JSON.stringify({ ok: true, payment_url: result.paymentUrl }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
