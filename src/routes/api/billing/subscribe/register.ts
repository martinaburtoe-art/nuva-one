import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import {
  createMercadoPagoSubscription,
  getMercadoPagoConfig,
} from "@/lib/fiscal/mercadopago-subscriptions.server";
import { NUVA_PLANS } from "@/lib/plan-config";
import { requireBusinessBillingManager } from "@/lib/fiscal/billing-access.server";

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

        const billingAccess = await requireBusinessBillingManager(client, businessId);
        if (!billingAccess.ok) {
          return Response.json({ error: billingAccess.error }, { status: billingAccess.status });
        }
        const { business, user } = billingAccess;

        const allowed = await checkRateLimit(`subscribe-register:${businessId}`, 10, 3600);
        if (!allowed) {
          return Response.json({ error: "Demasiados intentos, intenta más tarde" }, { status: 429 });
        }

        // Never create a second recurring preapproval while another one is
        // active, pending or paused; doing so could double-charge the business.
        const currentProvider = business.billing_provider ?? "none";
        if (currentProvider !== "none" && ["active", "pending", "paused"].includes(business.subscription_status ?? "")) {
          return Response.json({
            error: "Este negocio ya tiene una suscripción vinculada. Gestiona o cancela la suscripción actual antes de crear otra.",
            code: "SUBSCRIPTION_ALREADY_LINKED",
          }, { status: 409 });
        }

        const email = user.email;
        if (!email) {
          return Response.json({ error: "No encontramos un email para la cuenta" }, { status: 400 });
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

        const planKey: "starter" | "pro" =
          body.plan === "starter" || body.plan === "pro" ? body.plan : "pro";
        // El plan y el precio se resuelven siempre en el servidor. El cliente
        // solo elige qué plan contratar; nunca puede modificar el monto.
        const plan = NUVA_PLANS[planKey];
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
