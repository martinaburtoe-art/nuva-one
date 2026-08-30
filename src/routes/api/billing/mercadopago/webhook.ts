import { createFileRoute } from "@tanstack/react-router";
import {
  getMercadoPagoConfig,
  getMercadoPagoPayment,
  getMercadoPagoSubscription,
  isMercadoPagoSubscriptionActive,
  parseMercadoPagoExternalReference,
  validateMercadoPagoWebhookSignature,
} from "@/lib/fiscal/mercadopago-subscriptions.server";

type JsonRecord = Record<string, unknown>;

type MercadoPagoSubscription = JsonRecord & {
  external_reference?: string | null;
  status?: string | null;
  auto_recurring?: {
    frequency?: number | null;
    frequency_type?: string | null;
  } | null;
};

type MercadoPagoPayment = JsonRecord & {
  id?: string | number;
  external_reference?: string | null;
  transaction_amount?: number | null;
  status?: string | null;
  metadata?: JsonRecord | null;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asSubscription(value: JsonRecord): MercadoPagoSubscription {
  const recurring = isRecord(value.auto_recurring) ? value.auto_recurring : null;
  return {
    ...value,
    external_reference: typeof value.external_reference === "string" ? value.external_reference : null,
    status: typeof value.status === "string" ? value.status : null,
    auto_recurring: recurring
      ? {
          frequency: typeof recurring.frequency === "number" ? recurring.frequency : null,
          frequency_type: typeof recurring.frequency_type === "string" ? recurring.frequency_type : null,
        }
      : null,
  };
}

function asPayment(value: JsonRecord): MercadoPagoPayment {
  return {
    ...value,
    id: typeof value.id === "string" || typeof value.id === "number" ? value.id : undefined,
    external_reference: typeof value.external_reference === "string" ? value.external_reference : null,
    transaction_amount: typeof value.transaction_amount === "number" ? value.transaction_amount : null,
    status: typeof value.status === "string" ? value.status : null,
    metadata: isRecord(value.metadata) ? value.metadata : null,
  };
}

export const Route = createFileRoute("/api/billing/mercadopago/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const config = getMercadoPagoConfig();
        if (!config) return new Response("OK", { status: 200 });

        const url = new URL(request.url);
        const parsed = await request.json().catch(() => ({}));
        const payload = isRecord(parsed) ? parsed : {};
        const data = isRecord(payload.data) ? payload.data : {};
        const resourceId = String(
          data.id ?? payload.id ?? url.searchParams.get("data.id") ?? "",
        );
        const signatureValid = validateMercadoPagoWebhookSignature({
          signature: request.headers.get("x-signature"),
          requestId: request.headers.get("x-request-id"),
          dataId: resourceId || null,
          secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
        });
        if (!signatureValid) return new Response("Invalid webhook signature", { status: 401 });

        const type = String(payload.type ?? payload.topic ?? url.searchParams.get("type") ?? "");
        if (!resourceId) return new Response("OK", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (type.includes("subscription") || type === "preapproval") {
          const subscriptionResult = await getMercadoPagoSubscription(config, resourceId);
          if (!subscriptionResult.ok || !subscriptionResult.data) return new Response("OK", { status: 200 });
          const subscription = asSubscription(subscriptionResult.data);
          const { businessId, planId: referencedPlanId } = parseMercadoPagoExternalReference(
            subscription.external_reference,
          );
          const status = subscription.status ?? "pending";
          const active = isMercadoPagoSubscriptionActive(status);

          if (businessId) {
            const frequency = subscription.auto_recurring?.frequency ?? 1;
            const frequencyType = subscription.auto_recurring?.frequency_type ?? "months";
            const next = new Date();
            if (frequencyType === "days") next.setDate(next.getDate() + frequency);
            else if (frequencyType === "months") next.setMonth(next.getMonth() + frequency);
            else next.setMonth(next.getMonth() + 1);

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
              subscription_status:
                status === "cancelled" || status === "canceled"
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
              ...(status === "cancelled" || status === "canceled" ? { plan: "starter" } : {}),
            };
            await supabaseAdmin.from("businesses").update(update).eq("id", businessId);
          }
        }

        if (type === "payment" || type === "merchant_order") {
          const paymentResult = await getMercadoPagoPayment(config, resourceId);
          if (paymentResult.ok && paymentResult.data) {
            const payment = asPayment(paymentResult.data);
            const externalReference = String(payment.external_reference ?? "");
            const { businessId } = parseMercadoPagoExternalReference(externalReference);
            if (businessId) {
              const { data: business } = await supabaseAdmin
                .from("businesses")
                .select("id")
                .eq("id", businessId)
                .maybeSingle();
              if (business?.id) {
                await supabaseAdmin.from("subscription_charges").upsert(
                  {
                    business_id: business.id,
                    commerce_order: `mp-${resourceId}`,
                    amount: Number(payment.transaction_amount ?? 0),
                    status: String(payment.status ?? "pending"),
                    provider: "mercadopago",
                    provider_payment_id: String(payment.id),
                    provider_subscription_id: payment.metadata?.preapproval_id
                      ? String(payment.metadata.preapproval_id)
                      : null,
                  },
                  { onConflict: "commerce_order" },
                );
              }
            }
          }
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
