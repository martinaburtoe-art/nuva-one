import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

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
        if (!secretKey || !webhookSecret) return new Response("Billing no configurado", { status: 500 });

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

        async function setPlan(businessId: string, patch: Record<string, unknown>) {
          const { error } = await supabaseAdmin.from("businesses").update(patch as never).eq("id", businessId);
          if (error) console.error("Error actualizando plan de negocio", businessId, error);
        }

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const businessId = session.metadata?.business_id ?? session.client_reference_id;
            if (businessId) {
              await setPlan(businessId, {
                plan: "pro",
                subscription_status: "active",
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
              });
            }
            break;
          }
          case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            const businessId = sub.metadata?.business_id;
            if (businessId) {
              const active = sub.status === "active" || sub.status === "trialing";
              await setPlan(businessId, {
                plan: active ? "pro" : "starter",
                subscription_status: sub.status,
              });
            }
            break;
          }
          case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            const businessId = sub.metadata?.business_id;
            if (businessId) {
              await setPlan(businessId, { plan: "starter", subscription_status: "canceled" });
            }
            break;
          }
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
