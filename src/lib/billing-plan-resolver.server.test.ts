import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { resolvePlanUpdateForStripeEvent } from "./billing-plan-resolver.server";

function makeEvent(type: string, object: unknown): Pick<Stripe.Event, "type" | "data"> {
  return { type: type as Stripe.Event["type"], data: { object } as Stripe.Event["data"] };
}

describe("resolvePlanUpdateForStripeEvent", () => {
  describe("checkout.session.completed", () => {
    it("upgrades to pro using metadata.business_id when present", () => {
      const event = makeEvent("checkout.session.completed", {
        metadata: { business_id: "biz-1" },
        client_reference_id: "should-be-ignored",
        customer: "cus_123",
        subscription: "sub_123",
      });
      const result = resolvePlanUpdateForStripeEvent(event);
      expect(result).toEqual({
        businessId: "biz-1",
        patch: {
          plan: "pro",
          subscription_status: "active",
          stripe_customer_id: "cus_123",
          stripe_subscription_id: "sub_123",
        },
      });
    });

    it("falls back to client_reference_id when metadata.business_id is absent", () => {
      const event = makeEvent("checkout.session.completed", {
        metadata: {},
        client_reference_id: "biz-2",
        customer: "cus_456",
        subscription: "sub_456",
      });
      const result = resolvePlanUpdateForStripeEvent(event);
      expect(result?.businessId).toBe("biz-2");
      expect(result?.patch.plan).toBe("pro");
    });

    it("returns null when there is no business id anywhere (never silently touches a random business)", () => {
      const event = makeEvent("checkout.session.completed", {
        metadata: {},
        client_reference_id: null,
        customer: "cus_789",
        subscription: "sub_789",
      });
      expect(resolvePlanUpdateForStripeEvent(event)).toBeNull();
    });
  });

  describe("customer.subscription.updated", () => {
    it.each(["active", "trialing"])(
      "keeps/sets plan=pro when subscription status is '%s'",
      (status) => {
        const event = makeEvent("customer.subscription.updated", {
          metadata: { business_id: "biz-3" },
          status,
        });
        const result = resolvePlanUpdateForStripeEvent(event);
        expect(result).toEqual({
          businessId: "biz-3",
          patch: { plan: "pro", subscription_status: status },
        });
      },
    );

    it.each(["past_due", "unpaid", "incomplete", "incomplete_expired", "paused"])(
      "downgrades to starter when subscription status is '%s' (payment problem, not active)",
      (status) => {
        const event = makeEvent("customer.subscription.updated", {
          metadata: { business_id: "biz-4" },
          status,
        });
        const result = resolvePlanUpdateForStripeEvent(event);
        expect(result?.patch.plan).toBe("starter");
        expect(result?.patch.subscription_status).toBe(status);
      },
    );

    it("returns null without a business_id in metadata", () => {
      const event = makeEvent("customer.subscription.updated", {
        metadata: {},
        status: "active",
      });
      expect(resolvePlanUpdateForStripeEvent(event)).toBeNull();
    });
  });

  describe("customer.subscription.deleted", () => {
    it("always downgrades to starter with subscription_status canceled", () => {
      const event = makeEvent("customer.subscription.deleted", {
        metadata: { business_id: "biz-5" },
        status: "canceled",
      });
      const result = resolvePlanUpdateForStripeEvent(event);
      expect(result).toEqual({
        businessId: "biz-5",
        patch: { plan: "starter", subscription_status: "canceled" },
      });
    });
  });

  it("returns null for event types it doesn't handle (e.g. invoice.paid)", () => {
    const event = makeEvent("invoice.paid", { metadata: { business_id: "biz-6" } });
    expect(resolvePlanUpdateForStripeEvent(event)).toBeNull();
  });
});
