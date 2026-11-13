import crypto from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { getPaymentAdapter, decryptPaymentCreds } from "@/lib/fiscal/payment-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import { handlePaymentWebhook } from "@/lib/fiscal/payment-webhook-handler.server";

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

          let { data: savedIntent, error: savedIntentError } = await admin
            .from("payment_intents")
            .select("id, token, payment_url, status")
            .eq("provider", provider)
            .eq("commerce_order", existing.commerce_order)
            .maybeSingle();

          if (savedIntentError) throw savedIntentError;

          // A user retry doubles as a server-to-server status check. This lets
          // the POS resolve a delayed webhook without creating another order.
          if (["pending", "rejected", "expired"].includes(savedIntent?.status) && existing.status !== "recovery_required") {
            try {
              await handlePaymentWebhook(admin as any, existing.provider, savedIntent.token);
            } catch {
              return json(
                { error: "No se pudo verificar el estado del pago. El intento se conserva y no se creará otro.", code: "PAYMENT_STATUS_UNAVAILABLE" },
                503,
              );
            }

            const refreshedIntent = await admin
              .from("payment_intents")
              .select("id, token, payment_url, status")
              .eq("provider", provider)
              .eq("commerce_order", existing.commerce_order)
              .maybeSingle();
            if (refreshedIntent.error) throw refreshedIntent.error;
            savedIntent = refreshedIntent.data ?? savedIntent;

            const refreshedRequest = await admin
              .from("payment_creation_requests")
              .select("status")
              .eq("id", existing.id)
              .maybeSingle();
            if (refreshedRequest.error) throw refreshedRequest.error;
            existing.status = refreshedRequest.data?.status ?? existing.status;
          }

          if (existing.status === "recovery_required") {
            return json(
              {
                error: "El proveedor confirmó un resultado que requiere conciliación. El link queda bloqueado para evitar otro cobro.",
                code: "PAYMENT_RECOVERY_REQUIRED",
                commerce_order: existing.commerce_order,
              },
              409,
            );
          }

          if (savedIntent?.status === "paid") {
            await admin
              .from("payment_creation_requests")
              .update({ status: "closed", payment_intent_id: savedIntent.id, updated_at: new Date().toISOString() })
              .eq("id", existing.id);
            return json(
              { error: "Este intento ya fue pagado y conciliado. No se generará otro cobro para él.", code: "PAYMENT_ALREADY_SETTLED" },
              409,
            );
          }
          if (savedIntent?.status === "rejected" || savedIntent?.status === "expired") {
            if (existing.status !== "closed") {
              return json(
                { error: "El estado terminal del proveedor no pudo confirmarse. El intento queda bloqueado para evitar un doble cobro.", code: "PAYMENT_RECOVERY_REQUIRED" },
                409,
              );
            }
            return json(
              { error: "El intento anterior terminó sin pago. Puedes iniciar un nuevo intento con una clave nueva.", code: "PAYMENT_ATTEMPT_TERMINAL" },
              409,
            );
          }

          if (savedIntent?.payment_url) {
            if (existing.status === "closed") {
              return json(
                {
                  error: "La solicitud anterior está cerrada y no se reactivará automáticamente.",
                  code: "PAYMENT_RECOVERY_REQUIRED",
                  commerce_order: existing.commerce_order,
                },
                409,
              );
            }

            if (existing.status === "creating") {
              const claimRefresh = await admin
                .from("payment_creation_requests")
                .update({
                  status: "created",
                  payment_intent_id: savedIntent.id,
                  updated_at: new Date().toISOString(),
                  last_error: null,
                })
                .eq("id", existing.id)
                .eq("status", "creating")
                .select("id")
                .maybeSingle();

              if (claimRefresh.error) throw claimRefresh.error;
              if (!claimRefresh.data) {
                const latestClaim = await admin
                  .from("payment_creation_requests")
                  .select("status")
                  .eq("id", existing.id)
                  .maybeSingle();
                if (latestClaim.error) throw latestClaim.error;
                if (
                  latestClaim.data?.status === "recovery_required" ||
                  latestClaim.data?.status === "closed"
                ) {
                  return json(
                    {
                      error: "La solicitud cambió a un estado protegido y no se reactivará.",
                      code: "PAYMENT_RECOVERY_REQUIRED",
                      commerce_order: existing.commerce_order,
                    },
                    409,
                  );
                }
              }
            } else if (
              existing.status === "created" &&
              existing.payment_intent_id !== savedIntent.id
            ) {
              return json(
                {
                  error: "La referencia del intento no coincide con la solicitud registrada.",
                  code: "PAYMENT_RECOVERY_REQUIRED",
                  commerce_order: existing.commerce_order,
                },
                409,
              );
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

        if (saleId) {
          const { data: activeSaleRequest, error: activeSaleError } = await admin
            .from("payment_creation_requests")
            .select("*")
            .eq("business_id", businessId)
            .eq("sale_id", saleId)
            .in("status", ["creating", "created", "recovery_required"])
            .maybeSingle();

          if (activeSaleError) {
            return json({ error: "No se pudo comprobar si existe otro intento de cobro" }, 500);
          }

          if (activeSaleRequest) {
            let { data: activeIntent, error: activeIntentError } = await admin
              .from("payment_intents")
              .select("id, token, payment_url, status")
              .eq("provider", activeSaleRequest.provider)
              .eq("commerce_order", activeSaleRequest.commerce_order)
              .maybeSingle();

            if (activeIntentError) {
              return json({ error: "No se pudo recuperar el intento de cobro existente" }, 500);
            }

            if (["pending", "rejected", "expired"].includes(activeIntent?.status) && activeSaleRequest.status !== "recovery_required") {
              try {
                await handlePaymentWebhook(admin as any, activeSaleRequest.provider, activeIntent.token);
              } catch {
                return json(
                  { error: "No se pudo verificar el estado del link activo. No se creará otro cobro.", code: "PAYMENT_STATUS_UNAVAILABLE" },
                  503,
                );
              }

              const refreshedIntent = await admin
                .from("payment_intents")
                .select("id, token, payment_url, status")
                .eq("provider", activeSaleRequest.provider)
                .eq("commerce_order", activeSaleRequest.commerce_order)
                .maybeSingle();
              if (refreshedIntent.error) {
                return json({ error: "No se pudo recuperar el estado del intento" }, 500);
              }
              activeIntent = refreshedIntent.data ?? activeIntent;

              const refreshedRequest = await admin
                .from("payment_creation_requests")
                .select("status")
                .eq("id", activeSaleRequest.id)
                .maybeSingle();
              if (refreshedRequest.error) {
                return json({ error: "No se pudo recuperar el estado de la solicitud" }, 500);
              }
              activeSaleRequest.status = refreshedRequest.data?.status ?? activeSaleRequest.status;
            }

            if (activeSaleRequest.status === "recovery_required") {
              return json(
                {
                  error: "El intento de pago requiere conciliación y no se puede reutilizar ni duplicar.",
                  code: "PAYMENT_RECOVERY_REQUIRED",
                  commerce_order: activeSaleRequest.commerce_order,
                },
                409,
              );
            }

            if (activeIntent?.status === "paid") {
              await admin
                .from("payment_creation_requests")
                .update({ status: "closed", payment_intent_id: activeIntent.id, updated_at: new Date().toISOString() })
                .eq("id", activeSaleRequest.id);
              return json(
                { error: "La venta ya tiene un pago conciliado. No se generará otro cobro.", code: "PAYMENT_ALREADY_SETTLED" },
                409,
              );
            }

            if (activeIntent?.status === "rejected" || activeIntent?.status === "expired") {
              if (activeSaleRequest.status !== "closed") {
                return json(
                  {
                    error: "El estado terminal del proveedor no pudo confirmarse. El intento queda bloqueado para evitar un doble cobro.",
                    code: "PAYMENT_RECOVERY_REQUIRED",
                    commerce_order: activeSaleRequest.commerce_order,
                  },
                  409,
                );
              }
              // Provider rejection is verified and the request is closed;
              // a new idempotency key may now create a deliberate attempt.
            } else if (activeIntent?.payment_url && activeIntent.status === "pending") {
              if (
                Number(activeSaleRequest.amount) !== amount ||
                activeSaleRequest.subject !== subject ||
                activeSaleRequest.provider !== provider
              ) {
                return json(
                  { error: "La venta ya tiene un link activo con otros datos. Resuelve ese intento antes de cambiar el importe.", code: "PAYMENT_ACTIVE_INTENT" },
                  409,
                );
              }

              await admin
                .from("payment_creation_requests")
                .update({
                  status: "created",
                  payment_intent_id: activeIntent.id,
                  updated_at: new Date().toISOString(),
                  last_error: null,
                })
                .eq("id", activeSaleRequest.id);

              return json({
                ok: true,
                payment_url: activeIntent.payment_url,
                payment_intent_id: activeIntent.id,
                reused: true,
              });
            } else {
              return json(
                {
                  error: "La venta ya tiene un intento externo sin resolver. No se creará otro cobro hasta conciliarlo.",
                  code: "PAYMENT_RECOVERY_REQUIRED",
                  commerce_order: activeSaleRequest.commerce_order,
                },
                409,
              );
            }
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
            if (saleId) {
              const { data: unresolvedRace } = await admin
                .from("payment_creation_requests")
                .select("commerce_order, status")
                .eq("business_id", businessId)
                .eq("sale_id", saleId)
                .in("status", ["creating", "created", "recovery_required"])
                .maybeSingle();
              if (unresolvedRace) {
                return json(
                  {
                    error: "La venta ya tiene una solicitud activa. Reintenta con esta misma clave para recuperar el link existente.",
                    code: "PAYMENT_ACTIVE_INTENT",
                    commerce_order: unresolvedRace.commerce_order,
                  },
                  409,
                );
              }
            }
          }
          return json({ error: "No se pudo reservar el intento de cobro" }, 500);
        }

        const origin = new URL(request.url).origin;
        let result: any;
        try {
          const { apiKey, secretKey } = decryptPaymentCreds(integration as any);
          result = await adapter.createPayment(
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
        } catch {
          await admin
            .from("payment_creation_requests")
            .update({
              status: "recovery_required",
              last_error: "provider_request_ambiguous",
              updated_at: new Date().toISOString(),
            })
            .eq("id", claim.id);
          return json(
            {
              error: "No se pudo confirmar la respuesta de la pasarela. El intento quedó bloqueado para conciliación; no se repetirá automáticamente.",
              code: "PAYMENT_RECOVERY_REQUIRED",
              commerce_order: commerceOrder,
            },
            502,
          );
        }

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

        let paymentIntent: any = null;
        let intentError: any = null;
        try {
          const insertedIntent = await admin
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
          paymentIntent = insertedIntent.data;
          intentError = insertedIntent.error;
        } catch {
          intentError = new Error("payment_intent_persistence_threw");
        }

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

        const { data: updatedClaim, error: claimUpdateError } = await admin
          .from("payment_creation_requests")
          .update({
            status: "created",
            payment_intent_id: paymentIntent.id,
            updated_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", claim.id)
          .eq("status", "creating")
          .select("id")
          .maybeSingle();

        if (claimUpdateError || !updatedClaim) {
          const currentClaim = await admin
            .from("payment_creation_requests")
            .select("status, last_error")
            .eq("id", claim.id)
            .maybeSingle();

          if (currentClaim.data?.status === "recovery_required") {
            // A late terminal callback quarantined this sale while the
            // provider request was in flight. Never reactivate its link.
            await admin
              .from("payment_intents")
              .update({ status: "expired", resolved_at: new Date().toISOString() })
              .eq("id", paymentIntent.id)
              .eq("status", "pending");
            await admin
              .from("payment_creation_requests")
              .update({
                payment_intent_id: paymentIntent.id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", claim.id)
              .eq("status", "recovery_required");
            return json(
              {
                error: "La venta quedó en conciliación mientras se creaba el link. El nuevo intento fue bloqueado.",
                code: "PAYMENT_RECOVERY_REQUIRED",
                commerce_order: commerceOrder,
              },
              409,
            );
          }

          // A retry finds the intent by commerce_order and resolves whether
          // the webhook already settled or rejected it.
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
