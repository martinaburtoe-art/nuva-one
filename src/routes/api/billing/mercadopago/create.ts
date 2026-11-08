import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { requireBusinessBillingManager } from "@/lib/fiscal/billing-access.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import { NUVA_PLANS } from "@/lib/plan-config";
import {
  createMercadoPagoSubscription,
  updateMercadoPagoSubscription,
  getMercadoPagoConfig,
} from "@/lib/fiscal/mercadopago-subscriptions.server";

// Compatibility endpoint retained for older clients. New clients use
// /api/billing/subscribe/register; both paths enforce the same billing rules.
export const Route = createFileRoute("/api/billing/mercadopago/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        const planId = body.plan as "starter" | "pro" | undefined;
        const billing = body.billing === "annual" ? "annual" : "monthly";
        if (!businessId || (planId !== "starter" && planId !== "pro")) {
          return Response.json({ error: "business_id y un plan válido son requeridos" }, { status: 400 });
        }

        const billingAccess = await requireBusinessBillingManager(client, businessId);
        if (!billingAccess.ok) {
          return Response.json({ error: billingAccess.error }, { status: billingAccess.status });
        }
        const { business, user } = billingAccess;

        const currentProvider = business.billing_provider ?? "none";
        const currentStatus = business.subscription_status ?? "active";
        const canStartSubscription =
          (currentProvider === "none" && currentStatus === "active") ||
          currentStatus === "canceled" ||
          currentStatus === "cancelled";
        if (!canStartSubscription) {
          return Response.json({
            error: "Este negocio ya tiene una suscripción vinculada. Gestiona o cancela la suscripción actual antes de crear otra.",
            code: "SUBSCRIPTION_ALREADY_LINKED",
          }, { status: 409 });
        }

        const allowed = await checkRateLimit(`mp-subscription:${businessId}`, 10, 3600);
        if (!allowed) {
          return Response.json({ error: "Demasiados intentos, intenta más tarde" }, { status: 429 });
        }

        const config = getMercadoPagoConfig();
        if (!config) {
          return Response.json({
            configured: false,
            error: "Mercado Pago aún no está conectado. La experiencia demo está disponible.",
          }, { status: 503 });
        }

        const email = user.email;
        if (!email) return Response.json({ error: "No encontramos un email para la cuenta" }, { status: 400 });

        const plan = NUVA_PLANS[planId];
        const siteUrl = process.env.SITE_URL ?? "https://nuva-one.vercel.app";
        const result = await createMercadoPagoSubscription({
          config,
          businessId,
          businessName: business.name,
          email,
          planName: plan.name,
          planId,
          amount: billing === "annual" ? plan.annualPriceClp : plan.monthlyPriceClp,
          billing,
          backUrl: `${siteUrl}/settings?billing=mercadopago`,
        });

        if (!result.ok) return Response.json({ error: result.errorMessage }, { status: 502 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let attachQuery = supabaseAdmin
          .from("businesses")
          .update({
            billing_provider: "mercadopago",
            mercadopago_preapproval_id: result.preapprovalId,
            subscription_status: "pending",
          })
          .eq("id", businessId);
        attachQuery = business.billing_provider === null
          ? attachQuery.is("billing_provider", null)
          : attachQuery.eq("billing_provider", business.billing_provider);
        attachQuery = business.subscription_status === null
          ? attachQuery.is("subscription_status", null)
          : attachQuery.eq("subscription_status", business.subscription_status);
        const { data: attachedBusiness, error: updateError } = await attachQuery
          .select("id")
          .maybeSingle();

        if (updateError || !attachedBusiness) {
          const cleanup = await updateMercadoPagoSubscription(config, result.preapprovalId, { status: "canceled" });
          if (!cleanup.ok) {
            console.error("[billing] Could not cancel orphaned Mercado Pago preapproval", {
              businessId,
              preapprovalId: result.preapprovalId,
              error: cleanup.errorMessage,
            });
          }
          return Response.json({
            error: updateError
              ? "No pudimos guardar el estado de la suscripción"
              : "El estado de facturación cambió mientras se iniciaba el pago. Vuelve a intentarlo.",
            code: updateError ? "BILLING_STATE_SYNC_FAILED" : "SUBSCRIPTION_STATE_CONFLICT",
          }, { status: updateError ? 500 : 409 });
        }

        return Response.json({
          ok: true,
          provider: "mercadopago",
          preapproval_id: result.preapprovalId,
          url: result.initPoint,
          environment: config.environment,
          plan: planId,
        });
      },
    },
  },
});
