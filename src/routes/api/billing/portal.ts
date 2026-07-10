import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

// Lets a business owner manage (or cancel) their own subscription without
// needing to email support -- points to Stripe's hosted Billing Portal.

export const Route = createFileRoute("/api/billing/portal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        const siteUrl = process.env.SITE_URL ?? "https://nuvaone.lovable.app";
        if (!secretKey) return new Response(JSON.stringify({ error: "Billing no configurado" }), { status: 500 });

        const authHeader = request.headers.get("authorization");
        if (!authHeader) return new Response("Unauthorized", { status: 401 });

        const { createClient } = await import("@supabase/supabase-js");
        const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData, error: userError } = await userClient.auth.getUser();
        if (userError || !userData.user) return new Response("Unauthorized", { status: 401 });

        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        if (!businessId) return new Response("business_id requerido", { status: 400 });

        const { data: business, error: bizError } = await userClient
          .from("businesses")
          .select("id, stripe_customer_id")
          .eq("id", businessId)
          .maybeSingle();
        if (bizError || !business?.stripe_customer_id) {
          return new Response("Este negocio aún no tiene una suscripción activa", { status: 400 });
        }

        const stripe = new Stripe(secretKey);
        const session = await stripe.billingPortal.sessions.create({
          customer: business.stripe_customer_id,
          return_url: `${siteUrl}/settings`,
        });

        return new Response(JSON.stringify({ url: session.url }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
