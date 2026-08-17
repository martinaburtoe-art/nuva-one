import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MP_API = "https://api.mercadopago.com";
const CURRENT_STATUSES = ["trialing", "pending", "active", "paused", "past_due"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function mp(path: string, init: RequestInit = {}) {
  const response = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env("MERCADOPAGO_ACCESS_TOKEN")}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`Mercado Pago ${response.status}: ${JSON.stringify(body)}`);
  }
  return body as Record<string, unknown>;
}

async function ensureProviderPlan(
  service: ReturnType<typeof createClient>,
  plan: Record<string, any>,
  interval: "month" | "year",
  appUrl: string,
) {
  const column = interval === "year" ? "mercadopago_annual_plan_id" : "mercadopago_monthly_plan_id";
  const existing = plan[column];
  if (existing) return String(existing);

  const amount = Number(interval === "year" ? plan.annual_amount : plan.monthly_amount);
  const externalReference = `nuva:plan:${plan.code}:${interval}`;
  const providerPlan = await mp("/preapproval_plan", {
    method: "POST",
    body: JSON.stringify({
      reason: `Nüva One ${plan.name}`,
      external_reference: externalReference,
      auto_recurring: {
        frequency: interval === "year" ? 12 : 1,
        frequency_type: "months",
        transaction_amount: amount,
        currency_id: plan.currency,
        free_trial: { frequency: 14, frequency_type: "days" },
      },
      back_url: `${appUrl}/configuracion?billing=success`,
    }),
  });

  const providerPlanId = String(providerPlan.id ?? "");
  if (!providerPlanId) throw new Error("Mercado Pago did not return a plan id");

  const { error } = await service
    .from("billing_plans")
    .update({ [column]: providerPlanId, updated_at: new Date().toISOString() })
    .eq("id", plan.id);
  if (error) throw error;

  return providerPlanId;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const service = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    const body = await req.json();

    if (body?.action === "create_subscription") {
      const businessId = String(body.business_id ?? "");
      const planCode = String(body.plan_code ?? "");
      const interval = body.interval === "year" ? "year" : "month";
      if (!businessId || !planCode) return json({ error: "business_id and plan_code are required" }, 400);
      if (!user.email) return json({ error: "Authenticated user email is required for Mercado Pago" }, 400);

      const { data: member } = await service
        .from("business_members")
        .select("business_id")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!member) return json({ error: "Forbidden" }, 403);

      const { data: plan } = await service
        .from("billing_plans")
        .select(
          "id,code,name,monthly_amount,annual_amount,currency,mercadopago_monthly_plan_id,mercadopago_annual_plan_id",
        )
        .eq("code", planCode)
        .eq("active", true)
        .maybeSingle();
      if (!plan) return json({ error: "Plan not found" }, 404);

      const { data: current } = await service
        .from("billing_subscriptions")
        .select("id,status,plan_id,billing_interval,provider_subscription_id,metadata")
        .eq("business_id", businessId)
        .in("status", CURRENT_STATUSES)
        .maybeSingle();
      if (current) {
        const metadata = (current.metadata ?? {}) as Record<string, unknown>;
        if (
          current.plan_id === plan.id &&
          current.billing_interval === interval &&
          current.status === "pending" &&
          typeof metadata.checkout_url === "string"
        ) {
          return json({
            ok: true,
            existing: true,
            subscription_id: current.id,
            provider_subscription_id: current.provider_subscription_id,
            checkout_url: metadata.checkout_url,
          });
        }
        return json(
          {
            error: "An active or pending subscription already exists for this business",
            subscription_id: current.id,
            status: current.status,
          },
          409,
        );
      }

      const appUrl = env("NUVA_APP_URL").replace(/\/$/, "");
      const providerPlanId = await ensureProviderPlan(service, plan, interval, appUrl);
      const externalReference = `nuva:${businessId}:${plan.code}:${interval}`;

      const providerSubscription = await mp("/preapproval", {
        method: "POST",
        body: JSON.stringify({
          preapproval_plan_id: providerPlanId,
          reason: `Nüva One ${plan.name}`,
          external_reference: externalReference,
          payer_email: user.email,
          back_url: `${appUrl}/configuracion?billing=success`,
          status: "pending",
        }),
      });

      const providerSubscriptionId = String(providerSubscription.id ?? "");
      if (!providerSubscriptionId) throw new Error("Mercado Pago did not return a subscription id");
      const checkoutUrl = String(
        providerSubscription.init_point ?? providerSubscription.sandbox_init_point ?? "",
      );
      if (!checkoutUrl) throw new Error("Mercado Pago did not return a checkout URL");

      const { data: subscription, error } = await service
        .from("billing_subscriptions")
        .insert({
          business_id: businessId,
          plan_id: plan.id,
          provider: "mercadopago",
          provider_plan_id: providerPlanId,
          provider_subscription_id: providerSubscriptionId,
          status: "pending",
          billing_interval: interval,
          trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
          metadata: {
            external_reference: externalReference,
            payer_email: user.email,
            checkout_url: checkoutUrl,
          },
        })
        .select("id")
        .single();
      if (error) throw error;

      return json({
        ok: true,
        subscription_id: subscription.id,
        provider_plan_id: providerPlanId,
        provider_subscription_id: providerSubscriptionId,
        checkout_url: checkoutUrl,
      });
    }

    if (body?.action === "sync_subscription") {
      const subscriptionId = String(body.subscription_id ?? "");
      if (!subscriptionId) return json({ error: "subscription_id is required" }, 400);

      const { data: local } = await service
        .from("billing_subscriptions")
        .select("id,business_id,provider_subscription_id")
        .eq("id", subscriptionId)
        .maybeSingle();
      if (!local) return json({ error: "Subscription not found" }, 404);

      const { data: member } = await service
        .from("business_members")
        .select("business_id")
        .eq("business_id", local.business_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!member) return json({ error: "Forbidden" }, 403);
      if (!local.provider_subscription_id) return json({ error: "Provider subscription is not linked yet" }, 409);

      return json({
        ok: true,
        subscription: await mp(`/preapproval/${encodeURIComponent(local.provider_subscription_id)}`),
      });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("mercadopago-billing", error);
    return json({ error: "Billing unavailable" }, 500);
  }
});
