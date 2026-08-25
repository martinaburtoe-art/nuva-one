import { getNuvaPlan, type NuvaPlan } from "./plan-config";

export type PlanLimitKey = "users" | "products" | "aiMessagesMonthly" | "storageMb";
export type PlanFeatureKey = keyof ReturnType<typeof getNuvaPlan>["features"];

export function resolvePlan(plan: string | null | undefined): NuvaPlan {
  return plan === "pro" ? "pro" : "starter";
}

export function getPlanLimit(plan: string | null | undefined, key: PlanLimitKey) {
  const config = getNuvaPlan(plan);
  switch (key) {
    case "users":
      return config.includedUsers;
    case "products":
      return config.maxProducts;
    case "aiMessagesMonthly":
      return config.aiMessagesMonthly;
    case "storageMb":
      return config.storageMb;
  }
}

export function hasPlanFeature(plan: string | null | undefined, feature: PlanFeatureKey) {
  return getNuvaPlan(plan).features[feature] !== false;
}

export function canUseQuantity(
  plan: string | null | undefined,
  key: Exclude<PlanLimitKey, "storageMb">,
  current: number,
  requested = 1,
) {
  return current + requested <= getPlanLimit(plan, key);
}
