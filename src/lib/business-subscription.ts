export type BusinessSubscriptionAccessInput = {
  plan?: string | null;
  subscriptionStatus?: string | null;
  billingProvider?: string | null;
  createdAt?: string | null;
  nowMs?: number;
};

export type BusinessSubscriptionAccess = {
  hasAccess: boolean;
  trialActive: boolean;
  trialExpired: boolean;
  trialDaysLeft: number;
  hasActivePaidSubscription: boolean;
  isDemoPro: boolean;
};

/**
 * Resolves the UI access state from persisted billing fields.
 * The database/RLS must enforce the same rule; this helper is not a security boundary.
 */
export function getBusinessSubscriptionAccess(
  input: BusinessSubscriptionAccessInput,
): BusinessSubscriptionAccess {
  const plan = input.plan ?? "starter";
  const subscriptionStatus = input.subscriptionStatus ?? "active";
  const billingProvider = input.billingProvider ?? "none";
  const nowMs = input.nowMs ?? Date.now();
  const createdAtMs = input.createdAt ? new Date(input.createdAt).getTime() : Number.NaN;
  const ageDays = Number.isFinite(createdAtMs)
    ? Math.max(0, Math.floor((nowMs - createdAtMs) / 86_400_000))
    : 15;
  const trialDaysLeft = Math.max(0, 15 - ageDays);

  const hasActivePaidSubscription =
    subscriptionStatus === "active" && billingProvider !== "none";
  const isDemoPro =
    plan === "pro" && subscriptionStatus === "active" && billingProvider === "none";
  const trialActive =
    plan === "starter" &&
    subscriptionStatus === "active" &&
    billingProvider === "none" &&
    trialDaysLeft > 0;
  const hasAccess = hasActivePaidSubscription || isDemoPro || trialActive;

  return {
    hasAccess,
    trialActive,
    trialExpired: !hasAccess,
    trialDaysLeft,
    hasActivePaidSubscription,
    isDemoPro,
  };
}
