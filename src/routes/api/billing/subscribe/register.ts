import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import {
  createFlowCustomer,
  sendCardRegistration,
  getFlowSubscriptionCreds,
} from "@/lib/fiscal/flow-subscriptions.server";
import {
  createMercadoPagoSubscription,
  getMercadoPagoConfig,
} from "@/lib/fiscal/mercadopago-subscriptions.server";
import { NUVA_PLANS } from "@/lib/plan-config";

// Compatibilidad del checkout existente: Mercado Pago es ahora el proveedor
// primario. Si aún no existen credenciales de Mercado Pago, el mismo endpoint
// entrega la experiencia demo; si Flow sigue configurado, queda como fallback.
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
          .select("id, name, flow_customer_id")
          .eq("id", businessId)
          .maybeSingle();
        if (bizError || !business)
          return new Response("Negocio no encontrado o sin acceso", { status: 403 });

        const { data: userData } = await client.auth.getUser();
        const email = userData.user?.email;

        // Inferimos la modalidad desde el checkout actual para no romper la UX
        // existente: /checkout?plan=pro&billing=annual|monthly.
        const referer = request.headers.get("referer");
        const refererUrl = referer ? new URL(referer) : null;
        const billing = body.billing === "annual" || refererUrl?.searchParams.get("billing") === "annual"
          ? "annual"
          : "monthly";

        const mercadoPago = getMercadoPagoConfig();
        if (mercadoPago) {
          if (!email) return new Response(JSON.stringify({ error: "No encontramos un email para la cuenta" }), { status: 400 });
          const plan = NUVA_PLANS.pro;
          const result = await createMercadoPagoSubscription({
            config: mercadoPago,
            businessId,
            businessName: business.name,
            email,
            planName: plan.name,
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
          await supabaseAdmin
            .from("businesses")
            .update({
              billing_provider: "mercadopago",
              mercadopago_preapproval_id: result.preapprovalId,
              subscription_status: "pending",
            })
            .eq("id", businessId);

          return new Response(
            JSON.stringify({ ok: true, provider: "mercadopago", url: result.initPoint }),
            { headers: { "Content-Type": "application/json" } },
          );
        }

        // Sin credenciales reales, el checkout sigue siendo navegable y testeable.
        if (!email) {
          return new Response(JSON.stringify({ error: "No encontramos un email para la cuenta" }), { status: 400 });
        }

        const demoUrl = `${siteUrl}/checkout-demo?plan=pro&billing=${billing}`;
        const flow = getFlowSubscriptionCreds();
        if (!flow) {
          return new Response(JSON.stringify({ ok: true, provider: "demo", url: demoUrl }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        let customerId = (business as any).flow_customer_id as string | null;
        if (!customerId) {
          const created = await createFlowCustomer(flow, {
            businessId,
            name: business.name,
            email,
          });
          if (!created.ok)
            return new Response(JSON.stringify({ error: created.errorMessage }), { status: 502 });
          customerId = created.customerId;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin
            .from("businesses")
            .update({ flow_customer_id: customerId, flow_card_status: "pending" })
            .eq("id", businessId);
        }

        const registration = await sendCardRegistration(flow, {
          customerId: customerId!,
          returnUrl: `${siteUrl}/api/billing/subscribe/callback?business_id=${businessId}`,
        });
        if (!registration.ok)
          return new Response(JSON.stringify({ error: registration.errorMessage }), { status: 502 });

        return new Response(JSON.stringify({ ok: true, provider: "flow", url: registration.registerUrl }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
