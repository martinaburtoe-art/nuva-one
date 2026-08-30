import { createFileRoute } from "@tanstack/react-router";
import {
  getMercadoPagoConfig,
  getMercadoPagoPayment,
  getMercadoPagoSubscription,
  isMercadoPagoSubscriptionActive,
  parseMercadoPagoExternalReference,
  validateMercadoPagoWebhookSignature,
} from "@/lib/fiscal/mercadopago-subscriptions.server";

export const Route = createFileRoute("/api/billing/mercadopago/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const config = getMercadoPagoConfig();
        if (!config) return new Response("OK", { status: 200 });

        const url = new URL(request.url);
        const payload = await request.json().catch(() => ({}));
        const resourceId = String(payload?.data?.id ?? payload?.id ?? url.searchParams.get("data.id") ?? "");
        const signatureValid = validateMercadoPagoWebhookSignature({
          signature: request.headers.get("x-signature"),
          requestId: request.headers.get("x-request-id"),
          dataId: resourceId || null,
          secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
        });
        if (!signatureValid) return new Response("Invalid webhook signature", { status: 401 });

        const type = String(payload?.type ?? payload?.topic ?? url.searchParams.get("type") ?? "");
        if (!resourceId) return new Response("OK", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (type.includes("subscription") || type === "preapproval") {
          const subscription = await getMercadoPagoSubscription(config, resourceId);
          if (!subscription.ok || !subscription.data) return new Response("OK", { status: 200 });

          const { businessId, planId: referencedPlanId } = parseMercadoPagoExternalReference(
            subscription.data.external_reference,
          );
          const status = String(subscription.data.status ?? "pending");
          const active = isMercadoPagoSubscriptionActive(status);

          if (businessId) {
            const frequency = Number(subscription.data.auto_recurring?.frequency ?? 1);
            const frequencyType = String(subscription.data.auto_recurring?.frequency_type ?? "months");
            const next = new Date();
            if (frequencyType === "days") next.setDate(next.getDate() + frequency);
            else if (frequencyType === "months") next.setMonth(next.getMonth() + frequency);
            else next.setMonth(next.getMonth() + 1);

            // New subscriptions carry the selected plan in external_reference.
            // Legacy subscriptions without that marker preserve the current plan
            // instead of silently upgrading a Starter business to Pro.
            let resolvedPlanId = referencedPlanId;
            if (active && !resolvedPlanId) {
              const { data: business } = await supabaseAdmin
                .from("businesses")
                .select("plan")
                .eq("id", businessId)
                .maybeSingle();
              const currentPlan = String(business?.plan ?? "starter");
              resolvedPlanId = currentPlan === "pro" || currentPlan === "starter" ? currentPlan : "starter";
            }

            const update = {
              billing_provider: "mercadopago",
              mercadopago_preapproval_id: resourceId,
              subscription_status: status === "cancelled" || status === "canceled"
                ? "canceled"
                : active
                  ? "active"
                  : status,
              ...(active
                ? {
                    plan: resolvedPlanId ?? "starter",
                    billing_failed_attempts: 0,
                    next_charge_date: next.toISOString().slice(0, 10),
                  }
                : {}),
              ...(status === "cancelled" || status === "canceled"
                ? { plan: "starter" }
                : {}),
            };

            await supabaseAdmin.from("businesses").update(update).eq("id", businessId);
          }
        }

        if (type === "payment" || type === "merchant_order") {
          const payment = await getMercadoPagoPayment(config, resourceId);
          if (payment.ok && payment.data) {
            const p = payment.data;
            const externalReference = String(p.external_reference ?? "");
            if (externalReference) {
              await supabaseAdmin.from("subscription_charges").upsert(
                {
                  business_id: externalReference,
                  commerce_order: `mp-${resourceId}`,
                  amount: Number(p.transaction_amount ?? 0),
                  status: String(p.status ?? "pending"),
                  provider: "mercadopago",
                  provider_payment_id: String(p.id),
                  provider_subscription_id: p.metadata?.preapproval_id
                    ? String(p.metadata.preapproval_id)
                    : null,
                },
                { onConflict: "commerce_order" },
              );
            }
          }
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
