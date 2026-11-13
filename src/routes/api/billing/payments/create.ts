import crypto from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { getPaymentAdapter, decryptPaymentCreds } from "@/lib/fiscal/payment-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/billing/payments/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const businessId = String(body.business_id ?? "");
        const amount = Number(body.amount);
        const subject = String(body.subject || "Pago Nüva One");
        const saleId = body.sale_id ? String(body.sale_id) : null;
        const idempotencyKey = String(
          body.idempotency_key ?? request.headers.get("Idempotency-Key") ?? "",
        );

        if (
          !businessId ||
          !Number.isSafeInteger(amount) ||
          amount <= 0 ||
          !/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)
        ) {
          return json(
            { error: "Indica negocio, importe CLP entero y una clave de idempotencia válida" },
            400,
          );
        }

        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        // Prove tenant membership before using service-role-only request records.
        const { data: business, error: businessError } = await client
          .from("businesses")
          .select("id")
          .eq("id", businessId)
          .maybeSingle();

        if (businessError) return json({ error: "No se pudo validar el negocio" }, 500);
        if (!business) return json({ error: "Negocio no encontrado o sin acceso" }, 404);

        const allowed = await checkRateLimit(`payments-create:${businessId}`, 60, 3600);
        if (!allowed) return json({ error: "Demasiados intentos, intenta más tarde" }, 429);

        const { data: integration, error: integrationError } = await client
          .from("billing_integrations")
          .select("*")
          .eq("business_id", businessId)
          .eq("type", "payment")
          .eq("status", "connected")
          .maybeSingle();

        if (integrationError) return json({ error: "No se pudo validar la pasarela" }, 500);
        if (!integration) return json({ error: "No hay pasarela de pago conectada" }, 404);

        const provider = String((integration as any).provider);
        const adapter = getPaymentAdapter(provider);
        if (!adapter) return json({ error: "Proveedor de pago no soportado" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin: any = supabaseAdmin;

        const loadExisting = async () => {
          const { data, error } = await admin
            .from("payment_creation_requests")
            .select("*")
            .eq("business_id", businessId)
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();
          if (error) throw error;
          return data;
        };

        const respondFromExisting = async (existing: any) => {
          if (
            existing.provider !== provider ||
            existing.sale_id !== saleId ||
            Number(existing.amount) !== amount ||
            existing.subject !== subject
          ) {
            return json(
              { error: "La clave de idempotencia ya se utilizó con otros datos", code: "IDEMPOTENCY_CONFLICT" },
              409,
            );
          }

          const { data: savedIntent, error: savedIntentError } = await admin
            .from("payment_intents")
            .select("id, payment_url")
            .eq("provider", provider)
            .eq("commerce_order", existing.commerce_order)
            .maybeSingle();

          if (savedIntentError) throw savedIntentError;
          if (savedIntent?.payment_url) {
            if (existing.status !== "created" || existing.payment_intent_id !== savedIntent.id) {
              await admin
                .from("payment_creation_requests")
                .update({
                  status: "created",
                  payment_intent_id: savedIntent.id,
                  updated_at: new Date().toISOString(),
                  last_error: null,
                })
                .eq("id", existing.id);
            }
            return json({
              ok: true,
              payment_url: savedIntent.payment_url,
              payment_intent_id: savedIntent.id,
              reused: true,
            });
          }

          return json(
            {
              error: "Este intento ya fue reclamado y no se repetirá automáticamente para evitar un cobro duplicado. Requiere conciliación.",
              code: existing.status === "recovery_required" ? "PAYMENT_RECOVERY_REQUIRED" : "PAYMENT_CREATION_IN_PROGRESS",
              commerce_order: existing.commerce_order,
            },
            409,
          );
        };

        // A retry with the same key never contacts the provider twice.
        const existing = await loadExisting();
        if (existing) return respondFromExisting(existing);

        if (saleId) {
          const { data: sale, error: saleError } = await client
            .from("sales")
            .select("id, total, paid_amount, status")
            .eq("id", saleId)
            .eq("business_id", businessId)
            .maybeSingle();

          if (saleError) return json({ error: "No se pudo validar la venta" }, 500);
          if (!sale) return json({ error: "La venta no existe o no pertenece al negocio" }, 404);

          const remaining =
            Math.round((Number(sale.total) - Number(sale.paid_amount ?? 0)) * 100) / 100;

          if (
            sale.status === "draft" ||
            sale.status === "cancelled" ||
            !Number.isFinite(remaining) ||
            remaining <= 0
          ) {
            return json({ error: "La venta no admite nuevos cobros" }, 409);
          }
          if (amount > remaining) {
            return json(
              { error: "El importe supera el saldo pendiente de la venta", remaining },
              409,
            );
          }
        }

        const commerceOrder = `nuva-${crypto.randomUUID()}`;
        const { data: claim, error: claimError } = await admin
          .from("payment_creation_requests")
          .insert({
            business_id: businessId,
            sale_id: saleId,
            provider,
            idempotency_key: idempotencyKey,
            commerce_order: commerceOrder,
            amount,
            subject,
            status: "creating",
          })
          .select("*")
          .single();

        if (claimError) {
          if (claimError.code === "23505") {
            const raced = await loadExisting();
            if (raced) return respondFromExisting(raced);
          }
          return json({ error: "No se pudo reservar el intento de cobro" }, 500);
        }

        const { apiKey, secretKey } = decryptPaymentCreds(integration as any);
        const origin = new URL(request.url).origin;
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
            webhookUrl: `${origin}/api/billing/payments/webhook?provider=${provider}`,
          },
        );

        if (!result.ok || !result.token || !result.paymentUrl) {
          await admin
            .from("payment_creation_requests")
            .update({
              status: "recovery_required",
              last_error: "provider_create_unconfirmed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", claim.id);

          return json(
            {
              error: "La pasarela no confirmó la creación. El intento quedó reservado para conciliación y no se repetirá automáticamente.",
              code: "PAYMENT_RECOVERY_REQUIRED",
              commerce_order: commerceOrder,
            },
            502,
          );
        }

        const { data: paymentIntent, error: intentError } = await admin
          .from("payment_intents")
          .insert({
            business_id: businessId,
            sale_id: saleId,
            provider,
            token: result.token,
            commerce_order: commerceOrder,
            amount,
            status: "pending",
            payment_url: result.paymentUrl,
          })
          .select("id, payment_url")
          .single();

        if (intentError || !paymentIntent) {
          await admin
            .from("payment_creation_requests")
            .update({
              status: "recovery_required",
              last_error: "provider_created_but_intent_persistence_failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", claim.id);
          return json(
            {
              error: "La pasarela creó el cobro, pero Nüva One no pudo guardar su referencia. No vuelvas a generarlo; requiere conciliación.",
              code: "PAYMENT_RECOVERY_REQUIRED",
              commerce_order: commerceOrder,
            },
            502,
          );
        }

        const { error: claimUpdateError } = await admin
          .from("payment_creation_requests")
          .update({
            status: "created",
            payment_intent_id: paymentIntent.id,
            updated_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", claim.id);

        if (claimUpdateError) {
          // A retry finds the intent by commerce_order and returns its saved URL.
          return json(
            {
              error: "El cobro fue creado y guardado; se está recuperando su referencia interna.",
              code: "PAYMENT_CREATION_RECOVERY",
              commerce_order: commerceOrder,
            },
            503,
          );
        }

        return json({
          ok: true,
          payment_url: paymentIntent.payment_url,
          payment_intent_id: paymentIntent.id,
        });
      },
    },
  },
});
