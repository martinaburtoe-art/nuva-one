import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";

const MP_API = "https://api.mercadopago.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function serviceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function createMercadoPagoPlan(input: {
  name: string;
  amount: number;
  interval: "month" | "year";
  externalReference: string;
  backUrl: string;
}) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");
  const response = await fetch(`${MP_API}/preapproval_plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      reason: `Nüva One ${input.name}`,
      external_reference: input.externalReference,
      auto_recurring: {
        frequency: input.interval === "year" ? 12 : 1,
        frequency_type: "months",
        transaction_amount: input.amount,
        currency_id: "CLP",
        free_trial: { frequency: 14, frequency_type: "days" },
      },
      back_url: input.backUrl,
    }),
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    console.error("Mercado Pago plan creation failed", response.status, payload);
    throw new Error("No se pudo crear el plan de suscripción");
  }
  return payload;
}

export const Route = createFileRoute("/api/billing/subscribe/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });
        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        const interval = body.interval === "year" ? "year" : "month";
        if (!businessId) return json({ error: "business_id requerido" }, 400);

        const allowed = await checkRateLimit(`subscribe-register:${businessId}`, 10, 3600);
        if (!allowed) return json({ error: "Demasiados intentos, intenta más tarde" }, 429);

        const { data: business, error: bizError } = await client
          .from("businesses")
          .select("id, name, plan, subscription_status")
          .eq("id", businessId)
          .maybeSingle();
        if (bizError || !business) return new Response("Negocio no encontrado o sin acceso", { status: 403 });
        if (business.plan === "pro" && business.subscription_status === "active") {
          return json({ error: "El negocio ya tiene una suscripción Pro activa" }, 409);
        }

        const admin = serviceClient();
        const { data: plan, error: planError } = await admin
          .from("billing_plans")
          .select("id, name, monthly_amount, annual_amount, mercadopago_monthly_plan_id, mercadopago_annual_plan_id")
          .eq("code", "pro")
          .eq("active", true)
          .single();
        if (planError || !plan) return json({ error: "Plan Pro no disponible" }, 500);

        const providerPlanColumn = interval === "year" ? "mercadopago_annual_plan_id" : "mercadopago_monthly_plan_id";
        let providerPlanId = (plan as Record<string, unknown>)[providerPlanColumn] as string | null;
        let checkoutUrl = "";
        const siteUrl = process.env.SITE_URL ?? "https://nuva-one.vercel.app";
        const externalReference = `nuva:${businessId}:pro:${interval}`;

        if (providerPlanId) {
          const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
          if (!token) return json({ error: "Mercado Pago no configurado" }, 500);
          const response = await fetch(`${MP_API}/preapproval_plan/${encodeURIComponent(providerPlanId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const remote = (await response.json()) as Record<string, unknown>;
            checkoutUrl = String(remote.init_point ?? "");
          } else {
            providerPlanId = null;
          }
        }

        if (!providerPlanId || !checkoutUrl) {
          const amount = interval === "year" ? Number(plan.annual_amount) : Number(plan.monthly_amount);
          const remote = await createMercadoPagoPlan({
            name: String(plan.name),
            amount,
            interval,
            externalReference,
            backUrl: `${siteUrl}/settings?billing=success`,
          });
          providerPlanId = String(remote.id ?? "");
          checkoutUrl = String(remote.init_point ?? "");
          if (!providerPlanId || !checkoutUrl) return json({ error: "Mercado Pago no devolvió un checkout válido" }, 502);
          const { error: planUpdateError } = await admin
            .from("billing_plans")
            .update({ [providerPlanColumn]: providerPlanId })
            .eq("id", plan.id);
          if (planUpdateError) {
            console.error("Failed to persist Mercado Pago plan id", planUpdateError);
            return json({ error: "No se pudo persistir la configuración de pagos" }, 500);
          }
        }

        const { data: local, error: insertError } = await admin
          .from("billing_subscriptions")
          .insert({
            business_id: businessId,
            plan_id: plan.id,
            provider: "mercadopago",
            provider_plan_id: providerPlanId,
            status: "pending",
            billing_interval: interval,
            trial_ends_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
            metadata: { external_reference: externalReference },
          })
          .select("id")
          .single();
        if (insertError || !local) {
          console.error("Failed to persist billing subscription", insertError);
          return json({ error: "No se pudo registrar la suscripción" }, 500);
        }

        return json({ ok: true, url: checkoutUrl, subscription_id: local.id });
      },
    },
  },
});
