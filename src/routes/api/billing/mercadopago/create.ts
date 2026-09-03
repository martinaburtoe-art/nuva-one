import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import { getClientIpFingerprint, jsonRequestTooLarge } from "@/lib/request-security.server";
import { NUVA_PLANS } from "@/lib/plan-config";
import {
  createMercadoPagoSubscription,
  getMercadoPagoConfig,
} from "@/lib/fiscal/mercadopago-subscriptions.server";

const createSubscriptionSchema = z.object({
  business_id: z.string().uuid(),
  plan: z.enum(["starter", "pro"]),
  billing: z.enum(["monthly", "annual"]).default("monthly"),
}).strict();

export const Route = createFileRoute("/api/billing/mercadopago/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (jsonRequestTooLarge(request, 8 * 1024)) {
          return Response.json({ error: "Solicitud demasiado grande" }, { status: 413 });
        }
        const client = await authedUserClient(request);
        if (!client) return new Response("Unauthorized", { status: 401 });

        const parsed = createSubscriptionSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "Datos de suscripción inválidos" }, { status: 400 });
        }
        const { business_id: businessId, plan: planId, billing } = parsed.data;

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

        const allowedByBusiness = await checkRateLimit(`mp-subscription:${businessId}`, 10, 3600);
        const allowedByIp = await checkRateLimit(`mp-subscription-ip:${getClientIpFingerprint(request)}`, 30, 3600);
        if (!allowedByBusiness || !allowedByIp) {
          return Response.json({ error: "Demasiados intentos, intenta más tarde" }, { status: 429, headers: { "Retry-After": "3600" } });
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
          plan: planId,
        });
      },
    },
  },
});
