import { createFileRoute } from "@tanstack/react-router";
import {
  getMercadoPagoAuthorizedPayment,
  getMercadoPagoConfig,
  getMercadoPagoPayment,
  getMercadoPagoSubscription,
  isValidMercadoPagoBusinessId,
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

        if (type === "payment" || type === "subscription_authorized_payment") {
          const authorizedResult = type === "subscription_authorized_payment"
            ? await getMercadoPagoAuthorizedPayment(config, resourceId)
            : null;
          const authorized = authorizedResult?.ok && authorizedResult.data
            ? authorizedResult.data
            : null;
          const authorizedPaymentId = authorized && (
            typeof authorized.payment_id === "string" || typeof authorized.payment_id === "number"
              ? String(authorized.payment_id)
              : isRecord(authorized.payment) && (typeof authorized.payment.id === "string" || typeof authorized.payment.id === "number")
                ? String(authorized.payment.id)
                : ""
          );
          const paymentId = type === "payment" ? resourceId : authorizedPaymentId;
          const paymentResult = paymentId ? await getMercadoPagoPayment(config, paymentId) : null;
          if (paymentResult?.ok && paymentResult.data) {
            const payment = asPayment(paymentResult.data);
            const preapprovalId = authorized && (
              typeof authorized.preapproval_id === "string" || typeof authorized.preapproval_id === "number"
                ? String(authorized.preapproval_id)
                : ""
            );
            let externalReference = String(payment.external_reference ?? authorized?.external_reference ?? "");
            if (!externalReference && preapprovalId) {
              const subscriptionResult = await getMercadoPagoSubscription(config, preapprovalId);
              if (subscriptionResult.ok && subscriptionResult.data) {
                externalReference = String(subscriptionResult.data.external_reference ?? "");
              }
            }
            const { businessId } = parseMercadoPagoExternalReference(externalReference);
            if (isValidMercadoPagoBusinessId(businessId)) {
              await supabaseAdmin.from("subscription_charges").upsert(
                {
                  business_id: businessId,
                  commerce_order: `mp-${String(payment.id ?? paymentId)}`,
                  amount: Number(payment.transaction_amount ?? 0),
                  status: String(payment.status ?? authorized?.status ?? "pending"),
                  provider: "mercadopago",
                  provider_payment_id: String(payment.id ?? paymentId),
                  provider_subscription_id: preapprovalId
                    || (payment.metadata?.preapproval_id ? String(payment.metadata.preapproval_id) : null),
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
