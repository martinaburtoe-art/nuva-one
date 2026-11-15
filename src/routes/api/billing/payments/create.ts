import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { getPaymentAdapter, decryptPaymentCreds } from "@/lib/fiscal/payment-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";

export const Route = createFileRoute("/api/billing/payments/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const businessId = typeof body.business_id === "string" ? body.business_id : "";
        const invoiceId = typeof body.invoice_id === "string" ? body.invoice_id : null;
        const saleId = typeof body.sale_id === "string" ? body.sale_id : null;
        const requestedAmount = Number(body.amount);
        const subjectInput = String(body.subject || "Pago Nüva One").slice(0, 100);
        if (!businessId || (!invoiceId && !saleId && (!Number.isSafeInteger(requestedAmount) || requestedAmount <= 0))) {
          return new Response(JSON.stringify({ error: "Faltan datos o el monto no es válido" }), { status: 400 });
        }
        if (invoiceId && saleId) {
          return new Response(JSON.stringify({ error: "Un pago no puede asociarse a una venta y a un documento simultáneamente" }), { status: 400 });
        }

        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        const allowed = await checkRateLimit(`payments-create:${businessId}`, 30, 3600);
        if (!allowed) {
          return new Response(JSON.stringify({ error: "Demasiados intentos, intenta más tarde" }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
          });
        }

        let amount = requestedAmount;
        let subject = subjectInput;
        let payerEmail: string | undefined;
        if (invoiceId) {
          const { data: invoice, error: invoiceError } = await client
            .from("invoices")
            .select("id,business_id,invoice_number,total,status,customer_name,customer_snapshot")
            .eq("id", invoiceId)
            .eq("business_id", businessId)
            .maybeSingle();
          if (invoiceError || !invoice) return new Response(JSON.stringify({ error: "Documento no encontrado" }), { status: 404 });
          if (!["issued", "partially_paid", "overdue"].includes(invoice.status)) {
            return new Response(JSON.stringify({ error: "El documento no está habilitado para cobro online" }), { status: 409 });
          }
          const { data: payments, error: paymentsError } = await client
            .from("invoice_payments")
            .select("amount")
            .eq("invoice_id", invoiceId)
            .eq("status", "confirmed");
          if (paymentsError) return new Response(JSON.stringify({ error: "No se pudo calcular el saldo del documento" }), { status: 500 });
          const paid = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
          amount = Math.round(Number(invoice.total) - paid);
          if (!Number.isSafeInteger(amount) || amount <= 0) {
            return new Response(JSON.stringify({ error: "El documento no tiene saldo pendiente" }), { status: 409 });
          }
          subject = `Documento interno FAC-${String(invoice.invoice_number).padStart(6, "0")}`;
          const snapshot = invoice.customer_snapshot as Record<string, unknown> | null;
          payerEmail = typeof snapshot?.email === "string" ? snapshot.email : undefined;
        } else if (!Number.isSafeInteger(amount) || amount <= 0) {
          return new Response(JSON.stringify({ error: "El monto debe ser un entero positivo en CLP" }), { status: 400 });
        }

        const { data: integration } = await client
          .from("billing_integrations")
          .select("*")
          .eq("business_id", businessId)
          .eq("type", "payment")
          .eq("status", "connected")
          .maybeSingle();
        if (!integration) {
          return new Response(JSON.stringify({ error: "No hay pasarela de pago conectada" }), { status: 404 });
        }
        if (invoiceId && integration.provider !== "flow") {
          return new Response(JSON.stringify({
            error: "El cobro online de documentos internos está habilitado actualmente para Flow. El adaptador VSB requiere certificación de su contrato antes de procesar estos documentos.",
            code: "INVOICE_PAYMENT_PROVIDER_NOT_CERTIFIED",
          }), { status: 409 });
        }

        const adapter = getPaymentAdapter(integration.provider);
        if (!adapter) return new Response(JSON.stringify({ error: "Proveedor de pago no soportado" }), { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (invoiceId) {
          const { data: pendingIntent } = await supabaseAdmin
            .from("payment_intents" as any)
            .select("id,checkout_url,created_at,amount")
            .eq("invoice_id", invoiceId)
            .eq("status", "pending")
            .maybeSingle();
          if (pendingIntent?.checkout_url && Number(pendingIntent.amount) === amount && Date.now() - new Date(pendingIntent.created_at).getTime() < 48 * 60 * 60 * 1000) {
            return new Response(JSON.stringify({
              ok: true,
              payment_url: pendingIntent.checkout_url,
              amount,
              currency: "CLP",
              reused: true,
            }), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
          }
          if (pendingIntent?.id) {
            await supabaseAdmin.from("payment_intents" as any)
              .update({ status: "expired" })
              .eq("id", pendingIntent.id);
          }
        }

        const { apiKey, secretKey } = decryptPaymentCreds(integration);
        const origin = new URL(request.url).origin;
        const commerceOrder = invoiceId
          ? `invoice-${invoiceId}-${crypto.randomUUID()}`
          : saleId ? `sale-${saleId}` : `order-${crypto.randomUUID()}`;

        const result = await adapter.createPayment(
          {
            apiKey,
            secretKey,
            apiUrl: integration.api_url || "",
            environment: integration.environment,
          },
          {
            amount,
            subject,
            commerceOrder,
            email: payerEmail,
            returnUrl: `${origin}/invoices?payment=${encodeURIComponent(commerceOrder)}`,
            webhookUrl: `${origin}/api/billing/payments/webhook?provider=${encodeURIComponent(integration.provider)}`,
          },
        );

        if (!result.ok || !result.token || !result.paymentUrl) {
          return new Response(
            JSON.stringify({ error: result.errorMessage ?? "El proveedor no devolvió un enlace de pago" }),
            { status: 502 },
          );
        }

        const { error: intentError } = await supabaseAdmin.from("payment_intents" as any).insert({
          business_id: businessId,
          sale_id: saleId,
          invoice_id: invoiceId,
          provider: integration.provider,
          token: result.token,
          commerce_order: commerceOrder,
          amount,
          checkout_url: result.paymentUrl,
          status: "pending",
        } as any);
        if (intentError) {
          if (invoiceId && intentError.code === "23505") {
            const { data: winner } = await supabaseAdmin.from("payment_intents" as any)
              .select("checkout_url")
              .eq("invoice_id", invoiceId)
              .eq("status", "pending")
              .maybeSingle();
            if (winner?.checkout_url) {
              return new Response(JSON.stringify({ ok: true, payment_url: winner.checkout_url, amount, currency: "CLP", reused: true }), {
                headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
              });
            }
          }
          return new Response(JSON.stringify({ error: "No se pudo registrar el intento de pago" }), { status: 500 });
        }

        return new Response(JSON.stringify({
          ok: true,
          payment_url: result.paymentUrl,
          amount,
          currency: "CLP",
          commerce_order: commerceOrder,
        }), {
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
