import { createFileRoute } from "@tanstack/react-router";
import { authedUserClient } from "@/lib/fiscal/fiscal-service.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import {
  createFlowCustomer,
  sendCardRegistration,
  getFlowSubscriptionCreds,
} from "@/lib/fiscal/flow-subscriptions.server";

// El dueño/admin del negocio hace clic en "Actualizar a Pro" -> este
// endpoint crea (o reutiliza) el customer de Flow y lo manda a registrar
// su tarjeta. El negocio recién pasa a plan='pro' cuando el callback
// (/api/billing/subscribe/callback) confirma el registro server-to-server.
export const Route = createFileRoute("/api/billing/subscribe/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const creds = getFlowSubscriptionCreds();
        const siteUrl = process.env.SITE_URL ?? "https://nuva-one.vercel.app";
        if (!creds)
          return new Response(JSON.stringify({ error: "Suscripciones no configuradas" }), {
            status: 500,
          });

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

        // RLS: solo miembros del negocio pasan este SELECT.
        const { data: business, error: bizError } = await client
          .from("businesses")
          .select("id, name, flow_customer_id")
          .eq("id", businessId)
          .maybeSingle();
        if (bizError || !business)
          return new Response("Negocio no encontrado o sin acceso", { status: 403 });

        const { data: userData } = await client.auth.getUser();
        const email = userData.user?.email ?? "sin-correo@nuvaone.cl";

        let customerId = (business as any).flow_customer_id as string | null;
        if (!customerId) {
          const created = await createFlowCustomer(creds, {
            businessId,
            name: (business as any).name,
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

        const registration = await sendCardRegistration(creds, {
          customerId: customerId!,
          returnUrl: `${siteUrl}/api/billing/subscribe/callback?business_id=${businessId}`,
        });
        if (!registration.ok)
          return new Response(JSON.stringify({ error: registration.errorMessage }), {
            status: 502,
          });

        return new Response(JSON.stringify({ ok: true, url: registration.registerUrl }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
