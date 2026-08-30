import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import {
  createMercadoPagoSubscription,
  getMercadoPagoConfig,
} from "@/lib/fiscal/mercadopago-subscriptions.server";
import { NUVA_PLANS } from "@/lib/plan-config";

// Mercado Pago is the only provider for the official Nüva One subscription
// checkout. We intentionally do not fall back to /checkout-demo or Flow:
// production billing must have one canonical payment path.
export const Route = createFileRoute("/api/billing/subscribe/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const siteUrl = process.env.SITE_URL ?? "https://nuva-one.vercel.app";
        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        if (!businessId) return new Response("business_id requerido", { status: 400 });

        const allowed = await checkRateLimit(`subscribe-register:${businessId}`, 10, 3600);
        if (!allowed) {
          return new Response(JSON.stringify({ error: "Demasiados intentos, intenta más tarde" }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: business, error: bizError } = await client
          .from("businesses")
          .select("id, name")
          .eq("id", businessId)
          .maybeSingle();
        if (bizError || !business) {
          return new Response("Negocio no encontrado o sin acceso", { status: 403 });
        }

        const { data: userData } = await client.auth.getUser();
        const email = userData.user?.email;
        if (!email) {
          return new Response(JSON.stringify({ error: "No encontramos un email para la cuenta" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const mercadoPago = getMercadoPagoConfig();
        if (!mercadoPago) {
          return new Response(
            JSON.stringify({
              error:
                "El sistema de pagos aún no está habilitado. Configura las credenciales de Mercado Pago para activar las suscripciones.",
              code: "MERCADOPAGO_NOT_CONFIGURED",
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        const referer = request.headers.get("referer");
        const refererUrl = referer ? new URL(referer) : null;
        const billing =
          body.billing === "annual" || refererUrl?.searchParams.get("billing") === "annual"
            ? "annual"
            : "monthly";

        const plan = NUVA_PLANS.pro;
        const result = await createMercadoPagoSubscription({
          config: mercadoPago,
          businessId,
          businessName: business.name,
          email,
          planName: plan.name,
          planId: plan.id,
          amount: billing === "annual" ? plan.annualPriceClp : plan.monthlyPriceClp,
          billing,
          backUrl: `${siteUrl}/settings?billing=mercadopago`,
        });

        if (!result.ok) {
          return new Response(JSON.stringify({ error: result.errorMessage }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: billingUpdateError } = await supabaseAdmin
          .from("businesses")
          .update({
            billing_provider: "mercadopago",
            mercadopago_preapproval_id: result.preapprovalId,
            subscription_status: "pending",
          })
          .eq("id", businessId);

        if (billingUpdateError) {
          return new Response(
            JSON.stringify({ error: "No pudimos guardar el estado de la suscripción." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({ ok: true, provider: "mercadopago", url: result.initPoint }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
