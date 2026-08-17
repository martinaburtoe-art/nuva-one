import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-signature, x-request-id" };
const MP_API = "https://api.mercadopago.com";

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function hmacSha256(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseSignature(value: string | null) {
  const parts = Object.fromEntries((value ?? "").split(",").map((part) => part.split("=")).filter(([k, v]) => k && v));
  return { ts: parts.ts ?? "", v1: parts.v1 ?? "" };
}

async function verifySignature(req: Request, dataId: string) {
  const secret = env("MERCADOPAGO_WEBHOOK_SECRET");
  const xSignature = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id") ?? "";
  const { ts, v1 } = parseSignature(xSignature);
  if (!ts || !v1 || !requestId || !dataId) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = await hmacSha256(secret, manifest);
  return expected === v1;
}

async function mpGet(path: string) {
  const response = await fetch(`${MP_API}${path}`, { headers: { Authorization: `Bearer ${env("MERCADOPAGO_ACCESS_TOKEN")}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(`Mercado Pago ${response.status}`);
  return body as Record<string, unknown>;
}

function mapSubscriptionStatus(status: string) {
  if (status === "authorized") return "active";
  if (status === "paused") return "paused";
  if (status === "cancelled" || status === "canceled") return "canceled";
  if (status === "pending") return "pending";
  return "past_due";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  try {
    const url = new URL(req.url);
    const dataId = url.searchParams.get("data.id") ?? "";
    const topic = url.searchParams.get("type") ?? "";
    if (!(await verifySignature(req, dataId))) return new Response("Invalid signature", { status: 401, headers: cors });

    const payload = await req.json();
    const eventKey = `${topic}:${dataId}:${payload?.action ?? "unknown"}`;
    const service = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

    const { data: event, error: eventError } = await service.from("billing_webhook_events").insert({ provider: "mercadopago", event_key: eventKey, topic, payload }).select("id").maybeSingle();
    if (eventError?.code === "23505") return new Response("ok", { status: 200, headers: cors });
    if (eventError) throw eventError;

    let subscriptionRemote: Record<string, unknown> | null = null;
    let paymentRemote: Record<string, unknown> | null = null;

    if (topic === "subscription_preapproval") {
      subscriptionRemote = await mpGet(`/preapproval/${encodeURIComponent(dataId)}`);
    } else if (topic === "subscription_authorized_payment") {
      paymentRemote = await mpGet(`/authorized_payments/${encodeURIComponent(dataId)}`);
      const preapprovalId = String(paymentRemote.preapproval_id ?? paymentRemote.preapproval?.id ?? "");
      if (preapprovalId) subscriptionRemote = await mpGet(`/preapproval/${encodeURIComponent(preapprovalId)}`);
    } else if (topic === "payment") {
      paymentRemote = await mpGet(`/v1/payments/${encodeURIComponent(dataId)}`);
    }

    if (subscriptionRemote) {
      const providerId = String(subscriptionRemote.id ?? dataId);
      const providerPlanId = String(subscriptionRemote.preapproval_plan_id ?? "");
      const status = mapSubscriptionStatus(String(subscriptionRemote.status ?? "pending"));
      const recurring = (subscriptionRemote.auto_recurring ?? {}) as Record<string, unknown>;
      const start = typeof recurring.start_date === "string" ? recurring.start_date : null;
      const next = typeof subscriptionRemote.next_payment_date === "string" ? subscriptionRemote.next_payment_date : null;
      const externalReference = String(subscriptionRemote.external_reference ?? "");
      const businessId = externalReference.match(/^nuva:([^:]+):/)?.[1] ?? "";

      const { data: localSubscription, error } = await service.from("billing_subscriptions").update({
        provider_subscription_id: providerId,
        provider_plan_id: providerPlanId || undefined,
        status,
        current_period_start: start,
        current_period_end: next,
        metadata: { external_reference: subscriptionRemote.external_reference ?? null, last_remote_status: subscriptionRemote.status ?? null },
        updated_at: new Date().toISOString(),
      }).eq("provider", "mercadopago").eq("provider_plan_id", providerPlanId).select("id,business_id,plan_id").maybeSingle();
      if (error) throw error;

      const targetBusinessId = localSubscription?.business_id ?? businessId;
      if (targetBusinessId) {
        const businessUpdate = status === "active"
          ? { plan: "pro", subscription_status: "active", billing_provider: "mercadopago", mercadopago_plan_id: providerPlanId || null, mercadopago_subscription_id: providerId, billing_failed_attempts: 0 }
          : status === "paused" || status === "past_due"
            ? { subscription_status: status, billing_provider: "mercadopago", mercadopago_plan_id: providerPlanId || null, mercadopago_subscription_id: providerId }
            : status === "canceled"
              ? { plan: "starter", subscription_status: "canceled", billing_provider: "mercadopago", mercadopago_plan_id: providerPlanId || null, mercadopago_subscription_id: providerId }
              : { subscription_status: status, billing_provider: "mercadopago", mercadopago_plan_id: providerPlanId || null, mercadopago_subscription_id: providerId };
        const { error: businessError } = await service.from("businesses").update(businessUpdate).eq("id", targetBusinessId);
        if (businessError) throw businessError;
      }
    }

    if (paymentRemote) {
      const providerPaymentId = String(paymentRemote.id ?? dataId);
      const preapprovalId = String(paymentRemote.preapproval_id ?? paymentRemote.preapproval?.id ?? "");
      const status = String(paymentRemote.status ?? paymentRemote.status_detail ?? "pending");
      const mapped = status === "approved" ? "approved" : status === "refunded" ? "refunded" : status === "rejected" ? "rejected" : status === "charged_back" ? "charged_back" : "pending";
      const { data: localSubscription } = preapprovalId
        ? await service.from("billing_subscriptions").select("id,business_id").eq("provider", "mercadopago").eq("provider_subscription_id", preapprovalId).maybeSingle()
        : { data: null };
      if (localSubscription) {
        const { error } = await service.from("billing_payments").upsert({
          subscription_id: localSubscription.id,
          business_id: localSubscription.business_id,
          provider: "mercadopago",
          provider_payment_id: providerPaymentId,
          amount: Number(paymentRemote.transaction_amount ?? paymentRemote.transaction_details?.total_paid_amount ?? 0),
          currency: String(paymentRemote.currency_id ?? "CLP"),
          status: mapped,
          paid_at: mapped === "approved" ? new Date().toISOString() : null,
          failure_reason: mapped === "rejected" ? String(paymentRemote.status_detail ?? "rejected") : null,
          metadata: { payment_type: topic },
        }, { onConflict: "provider,provider_payment_id" });
        if (error) throw error;
      }
    }

    if (event?.id) await service.from("billing_webhook_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", event.id);
    return new Response("ok", { status: 200, headers: cors });
  } catch (error) {
    console.error("mercadopago-webhook", error);
    return new Response("Webhook processing failed", { status: 500, headers: cors });
  }
});
