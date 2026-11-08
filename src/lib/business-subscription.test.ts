import { describe, expect, it } from "vitest";
import { getBusinessSubscriptionAccess } from "./business-subscription";

const now = Date.UTC(2026, 10, 8, 12);

describe("business subscription access", () => {
  it("allows a Starter trial while it is within fifteen days", () => {
    const access = getBusinessSubscriptionAccess({
      plan: "starter",
      subscriptionStatus: "active",
      billingProvider: "none",
      createdAt: new Date(now - 10 * 86_400_000).toISOString(),
      nowMs: now,
    });

    expect(access).toMatchObject({
      hasAccess: true,
      trialActive: true,
      trialExpired: false,
      trialDaysLeft: 5,
    });
  });

  it("expires an unpaid Starter trial after fifteen days", () => {
    const access = getBusinessSubscriptionAccess({
      plan: "starter",
      subscriptionStatus: "active",
      billingProvider: "none",
      createdAt: new Date(now - 15 * 86_400_000).toISOString(),
      nowMs: now,
    });

    expect(access).toMatchObject({
      hasAccess: false,
      trialActive: false,
      trialExpired: true,
      trialDaysLeft: 0,
    });
  });

  it("keeps a paid Starter subscription active after the trial window", () => {
    const access = getBusinessSubscriptionAccess({
      plan: "starter",
      subscriptionStatus: "active",
      billingProvider: "mercadopago",
      createdAt: new Date(now - 90 * 86_400_000).toISOString(),
      nowMs: now,
    });

    expect(access).toMatchObject({
      hasAccess: true,
      hasActivePaidSubscription: true,
      trialExpired: false,
    });
  });

  it("keeps a valid Starter trial available while Mercado Pago checkout is pending", () => {
    const access = getBusinessSubscriptionAccess({
      plan: "starter",
      subscriptionStatus: "pending",
      billingProvider: "mercadopago",
      createdAt: new Date(now - 2 * 86_400_000).toISOString(),
      nowMs: now,
    });

    expect(access).toMatchObject({ hasAccess: true, trialActive: true, trialExpired: false });
  });

  it("allows the no-payment Pro demo business", () => {
    const access = getBusinessSubscriptionAccess({
      plan: "pro",
      subscriptionStatus: "active",
      billingProvider: "none",
      createdAt: new Date(now - 90 * 86_400_000).toISOString(),
      nowMs: now,
    });

    expect(access).toMatchObject({ hasAccess: true, isDemoPro: true, trialExpired: false });
  });

  it.each(["paused", "canceled", "pending"])("blocks Pro when its subscription is %s", (status) => {
    const access = getBusinessSubscriptionAccess({
      plan: "pro",
      subscriptionStatus: status,
      billingProvider: "mercadopago",
      createdAt: new Date(now - 90 * 86_400_000).toISOString(),
      nowMs: now,
    });

    expect(access).toMatchObject({ hasAccess: false, trialExpired: true });
  });

  it("fails closed when a Starter business has no creation timestamp", () => {
    const access = getBusinessSubscriptionAccess({
      plan: "starter",
      subscriptionStatus: "active",
      billingProvider: "none",
      nowMs: now,
    });

    expect(access).toMatchObject({ hasAccess: false, trialExpired: true, trialDaysLeft: 0 });
  });
});
