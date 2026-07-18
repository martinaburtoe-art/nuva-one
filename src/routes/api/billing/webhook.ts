import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { resolvePlanUpdateForStripeEvent } from "@/lib/billing-plan-resolver.server";

// The ONLY place that actually flips a business between 'starter' and 'pro'.
// Never trust the Checkout success redirect for this -- a user could reach
// that URL without paying (back button, shared link, etc). Stripe signs
// every webhook payload, so we verify that signature before touching the DB.

export const Route = createFileRoute("/api/billing/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secretKey || !webhookSecret)
          return new Response("Billing no configurado", { status: 500 });

        const stripe = new Stripe(secretKey);
        const rawBody = await request.text();
        const signature = request.headers.get("stripe-signature");

        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(rawBody, signature ?? "", webhookSecret);
        } catch (err) {
          console.error("Stripe webhook signature inválida", err);
          return new Response("Invalid signature", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const update = resolvePlanUpdateForStripeEvent(event);
        if (update) {
          const { error } = await supabaseAdmin
            .from("businesses")
            .update(update.patch as never)
            .eq("id", update.businessId);
          if (error) console.error("Error actualizando plan de negocio", update.businessId, error);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
