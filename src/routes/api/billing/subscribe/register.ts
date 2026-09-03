import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import { getClientIpFingerprint, jsonRequestTooLarge } from "@/lib/request-security.server";
import {
  createMercadoPagoSubscription,
  getMercadoPagoConfig,
} from "@/lib/fiscal/mercadopago-subscriptions.server";
import { NUVA_PLANS } from "@/lib/plan-config";

const subscriptionSchema = z.object({ business_id: z.string().uuid(), billing: z.enum(["monthly", "annual"]).default("monthly") }).strict();

export const Route = createFileRoute("/api/billing/subscribe/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (jsonRequestTooLarge(request, 8 * 1024)) return Response.json({ error: "Solicitud demasiado grande" }, { status: 413 });
        const siteUrl = process.env.SITE_URL ?? "https://nuva-one.vercel.app";
        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Datos de suscripción inválidos" }, { status: 400 });
        const { business_id: businessId, billing } = parsed.data;

        const { data: userData } = await client.auth.getUser();
        const userId = userData.user?.id;
        const email = userData.user?.email;
        if (!userId) return new Response("Unauthorized", { status: 401 });
        if (!email) return Response.json({ error: "No encontramos un email para la cuenta" }, { status: 400 });

        const { data: membership } = await client
          .from("business_members")
          .select("role")
          .eq("business_id", businessId)
          .eq("user_id", userId)
          .in("role", ["owner", "admin"])
          .maybeSingle();
        if (!membership) return new Response("Forbidden", { status: 403 });

        const allowedByBusiness = await checkRateLimit(`subscribe-register:${businessId}`, 10, 3600);
        const allowedByIp = await checkRateLimit(`subscribe-register-ip:${getClientIpFingerprint(request)}`, 30, 3600);
        if (!allowedByBusiness || !allowedByIp) {
          return Response.json({ error: "Demasiados intentos, intenta más tarde" }, { status: 429, headers: { "Retry-After": "3600" } });
        }

        const { data: business, error: bizError } = await client
          .from("businesses")
          .select("id, name")
          .eq("id", businessId)
          .maybeSingle();
        if (bizError || !business) return new Response("Negocio no encontrado o sin acceso", { status: 403 });

        const mercadoPago = getMercadoPagoConfig();
        if (!mercadoPago) {
          return Response.json({
            error: "El sistema de pagos aún no está habilitado. Configura las credenciales de Mercado Pago para activar las suscripciones.",
            code: "MERCADOPAGO_NOT_CONFIGURED",
          }, { status: 503 });
        }

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

        if (!result.ok) return Response.json({ error: result.errorMessage }, { status: 502 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: billingUpdateError } = await supabaseAdmin
          .from("businesses")
          .update({ billing_provider: "mercadopago", mercadopago_preapproval_id: result.preapprovalId, subscription_status: "pending" })
          .eq("id", businessId);
        if (billingUpdateError) return Response.json({ error: "No pudimos guardar el estado de la suscripción." }, { status: 500 });

        return Response.json({ ok: true, provider: "mercadopago", url: result.initPoint });
      },
    },
  },
});
