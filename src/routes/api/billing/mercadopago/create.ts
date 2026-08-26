import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import { NUVA_PLANS } from "@/lib/plan-config";
import {
  createMercadoPagoSubscription,
  getMercadoPagoConfig,
} from "@/lib/fiscal/mercadopago-subscriptions.server";

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
        if (!businessId || !planId) {
          return Response.json({ error: "business_id y plan son requeridos" }, { status: 400 });
        }

        const config = getMercadoPagoConfig();
        if (!config) {
          return Response.json(
            {
              configured: false,
              error: "Mercado Pago aún no está conectado. La experiencia demo está disponible.",
            },
            { status: 503 },
          );
        }

        const allowed = await checkRateLimit(`mp-subscription:${businessId}`, 10, 3600);
        if (!allowed) {
          return Response.json({ error: "Demasiados intentos, intenta más tarde" }, { status: 429 });
        }

        const plan = NUVA_PLANS[planId];
        const { data: business, error } = await client
          .from("businesses")
          .select("id,name")
          .eq("id", businessId)
          .maybeSingle();
        if (error || !business) {
          return Response.json({ error: "Negocio no encontrado o sin acceso" }, { status: 403 });
        }

        const { data: userData } = await client.auth.getUser();
        const email = userData.user?.email;
        if (!email) return Response.json({ error: "No encontramos un email para la cuenta" }, { status: 400 });

        const siteUrl = process.env.SITE_URL ?? "https://nuva-one.vercel.app";
        const result = await createMercadoPagoSubscription({
          config,
          businessId,
          businessName: business.name,
          email,
          planName: plan.name,
          amount: billing === "annual" ? plan.annualPriceClp : plan.monthlyPriceClp,
          billing,
          backUrl: `${siteUrl}/settings?billing=mercadopago`,
        });

        if (!result.ok) return Response.json({ error: result.errorMessage }, { status: 502 });

        const { error: updateError } = await (await import("@/integrations/supabase/client.server"))
          .supabaseAdmin
          .from("businesses")
          .update({
            billing_provider: "mercadopago",
            mercadopago_preapproval_id: result.preapprovalId,
            subscription_status: "pending",
          })
          .eq("id", businessId);
        if (updateError) {
          return Response.json({ error: "No pudimos guardar el estado de la suscripción" }, { status: 500 });
        }

        return Response.json({
          ok: true,
          provider: "mercadopago",
          preapproval_id: result.preapprovalId,
          url: result.initPoint,
          environment: config.environment,
        });
      },
    },
  },
});
