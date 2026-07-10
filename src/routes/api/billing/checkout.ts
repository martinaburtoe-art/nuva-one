import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

// Creates a Stripe Checkout session for a business to subscribe to the Pro
// plan. The business's owner/admin calls this from Settings; on success,
// Stripe redirects back and the webhook (see /api/billing/webhook) is what
// actually flips the business to plan = 'pro' -- never trust the client
// redirect alone for that.

export const Route = createFileRoute("/api/billing/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        const priceId = process.env.STRIPE_PRICE_ID_PRO;
        const siteUrl = process.env.SITE_URL ?? "https://nuvaone.lovable.app";

        if (!secretKey || !priceId) {
          return new Response(JSON.stringify({ error: "Billing no configurado" }), { status: 500 });
        }

        const authHeader = request.headers.get("authorization");
        if (!authHeader) return new Response("Unauthorized", { status: 401 });

        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = process.env.SUPABASE_URL!;
        const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });

        const { data: userData, error: userError } = await userClient.auth.getUser();
        if (userError || !userData.user) return new Response("Unauthorized", { status: 401 });

        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        if (!businessId) return new Response("business_id requerido", { status: 400 });

        // RLS on businesses ensures this SELECT only succeeds if the caller
        // is actually a member of this business -- the anon-key client with
        // the user's JWT enforces that, not a manual role check here.
        const { data: business, error: bizError } = await userClient
          .from("businesses")
          .select("id, name, stripe_customer_id")
          .eq("id", businessId)
          .maybeSingle();
        if (bizError || !business) return new Response("Negocio no encontrado o sin acceso", { status: 403 });

        const stripe = new Stripe(secretKey);

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: priceId, quantity: 1 }],
          customer: business.stripe_customer_id ?? undefined,
          client_reference_id: business.id,
          metadata: { business_id: business.id },
          subscription_data: { metadata: { business_id: business.id } },
          success_url: `${siteUrl}/settings?upgrade=success`,
          cancel_url: `${siteUrl}/settings?upgrade=cancelled`,
        });

        return new Response(JSON.stringify({ url: session.url }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
