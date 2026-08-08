import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { getPaymentAdapter, decryptPaymentCreds } from "@/lib/fiscal/payment-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";

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

        // Un negocio real cobra decenas de veces por hora en un día ocupado;
        // 60/hora frena reintentos en loop o abuso sin estorbar el uso normal.
        const allowed = await checkRateLimit(`payments-create:${businessId}`, 60, 3600);
        if (!allowed) {
          return new Response(JSON.stringify({ error: "Demasiados intentos, intenta más tarde" }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: integration } = await client
          .from("billing_integrations")
          .select("*")
          .eq("business_id", businessId)
          .eq("type", "payment")
          .eq("status", "connected")
          .maybeSingle();
        if (!integration) {
          return new Response(JSON.stringify({ error: "No hay pasarela de pago conectada" }), {
            status: 404,
          });
        }

        const adapter = getPaymentAdapter((integration as any).provider);
        if (!adapter)
          return new Response(JSON.stringify({ error: "Proveedor de pago no soportado" }), {
            status: 400,
          });

        const { apiKey, secretKey } = decryptPaymentCreds(integration as any);
        const origin = new URL(request.url).origin;
        const commerceOrder = saleId ? `sale-${saleId}` : `order-${crypto.randomUUID()}`;

        const result = await adapter.createPayment(
          {
            apiKey,
            secretKey,
            apiUrl: (integration as any).api_url || "",
            environment: (integration as any).environment,
          },
          {
            amount,
            subject,
            commerceOrder,
            returnUrl: `${origin}/ventas?payment=${commerceOrder}`,
            webhookUrl: `${origin}/api/billing/payments/webhook?provider=${(integration as any).provider}`,
          },
        );

        if (!result.ok || !result.token)
          return new Response(
            JSON.stringify({ error: result.errorMessage ?? "El proveedor no devolvió un token" }),
            { status: 502 },
          );

        // Se usa supabaseAdmin (no el client con RLS del usuario) porque
        // payment_intents solo admite escritura desde service_role: el
        // estado "pagado" nunca debe poder fijarlo un cliente autenticado.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: intentError } = await supabaseAdmin.from("payment_intents").insert({
          business_id: businessId,
          sale_id: saleId,
          provider: (integration as any).provider,
          token: result.token,
          commerce_order: commerceOrder,
          amount,
          status: "pending",
        });
        if (intentError) {
          return new Response(
            JSON.stringify({ error: "No se pudo registrar el intento de pago" }),
            { status: 500 },
          );
        }

        return new Response(JSON.stringify({ ok: true, payment_url: result.paymentUrl }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
