import type Stripe from "stripe";

/**
 * Pure decision logic for src/routes/api/billing/webhook.ts: given a
 * (signature-already-verified) Stripe event, decides whether a business's
 * plan should change and to what. Contains zero I/O -- no Stripe SDK calls,
 * no Supabase calls -- specifically so this, the one function that decides
 * whether a business is "pro" or "starter", can be unit tested directly
 * instead of only being exercised by a real webhook hitting production.
 *
 * Returns null when the event type isn't handled, or when a handled event
 * is missing the business_id metadata it needs to act on.
 */
export function resolvePlanUpdateForStripeEvent(
  event: Pick<Stripe.Event, "type" | "data">,
): { businessId: string; patch: Record<string, unknown> } | null {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const businessId = session.metadata?.business_id ?? session.client_reference_id;
      if (!businessId) return null;
      return {
        businessId,
        patch: {
          plan: "pro",
          subscription_status: "active",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
        },
      };
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const businessId = sub.metadata?.business_id;
      if (!businessId) return null;
      const active = sub.status === "active" || sub.status === "trialing";
      return {
        businessId,
        patch: { plan: active ? "pro" : "starter", subscription_status: sub.status },
      };
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const businessId = sub.metadata?.business_id;
      if (!businessId) return null;
      return { businessId, patch: { plan: "starter", subscription_status: "canceled" } };
    }
    default:
      return null;
  }
}
