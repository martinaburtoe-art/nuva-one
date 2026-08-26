import { createFileRoute } from "@tanstack/react-router";
import { NUVA_PLANS } from "@/lib/plan-config";
import {
  getMercadoPagoConfig,
  getMercadoPagoPayment,
  getMercadoPagoSubscription,
  isMercadoPagoSubscriptionActive,
} from "@/lib/fiscal/mercadopago-subscriptions.server";

export const Route = createFileRoute("/api/billing/mercadopago/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const config = getMercadoPagoConfig();
        if (!config) return new Response("OK", { status: 200 });

        const payload = await request.json().catch(() => ({}));
        const type = String(payload?.type ?? payload?.topic ?? "");
        const resourceId = String(payload?.data?.id ?? payload?.id ?? "");
        if (!resourceId) return new Response("OK", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (type.includes("subscription") || type === "preapproval") {
          const subscription = await getMercadoPagoSubscription(config, resourceId);
          if (!subscription.ok || !subscription.data) return new Response("OK", { status: 200 });

          const externalReference = String(subscription.data.external_reference ?? "");
          const status = String(subscription.data.status ?? "pending");
          const active = isMercadoPagoSubscriptionActive(status);

          if (externalReference) {
            const update: Record<string, unknown> = {
              billing_provider: "mercadopago",
              mercadopago_preapproval_id: resourceId,
              subscription_status: active ? "active" : status,
            };
            if (active) {
              update.plan = NUVA_PLANS.pro.id;
              update.billing_failed_attempts = 0;
              const next = new Date();
              next.setMonth(next.getMonth() + 1);
              update.next_charge_date = next.toISOString().slice(0, 10);
            }
            if (status === "cancelled" || status === "canceled") {
              update.subscription_status = "canceled";
              update.plan = "starter";
            }
            await supabaseAdmin.from("businesses").update(update).eq("id", externalReference);
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
