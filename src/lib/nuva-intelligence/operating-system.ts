export type AutopilotMode = "observe" | "recommend" | "prepare" | "approve" | "automatic";
export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type SimulationInput = {
  revenue: number;
  variableCosts: number;
  fixedCosts: number;
  volume: number;
  price: number;
  priceChangePct?: number;
  volumeChangePct?: number;
  variableCostChangePct?: number;
  fixedCostChangePct?: number;
};

export type SimulationOutput = {
  revenue: number;
  variableCosts: number;
  fixedCosts: number;
  grossProfit: number;
  operatingProfit: number;
  marginPct: number;
  revenueDeltaPct: number;
  profitDeltaPct: number;
};

const pct = (value = 0) => value / 100;

export function simulateBusiness(input: SimulationInput): SimulationOutput {
  const price = input.price * (1 + pct(input.priceChangePct));
  const volume = input.volume * (1 + pct(input.volumeChangePct));
  const revenue = Math.max(0, price * volume);
  const variableCosts = Math.max(0, input.variableCosts * (1 + pct(input.variableCostChangePct)));
  const fixedCosts = Math.max(0, input.fixedCosts * (1 + pct(input.fixedCostChangePct)));
  const grossProfit = revenue - variableCosts;
  const operatingProfit = grossProfit - fixedCosts;
  const baselineProfit = input.revenue - input.variableCosts - input.fixedCosts;
  return {
    revenue,
    variableCosts,
    fixedCosts,
    grossProfit,
    operatingProfit,
    marginPct: revenue ? (operatingProfit / revenue) * 100 : 0,
    revenueDeltaPct: input.revenue ? ((revenue - input.revenue) / input.revenue) * 100 : 0,
    profitDeltaPct: baselineProfit ? ((operatingProfit - baselineProfit) / Math.abs(baselineProfit)) * 100 : 0,
  };
}

export type AutopilotPolicy = {
  mode: AutopilotMode;
  enabled: boolean;
  approvalRequired: boolean;
  constraints?: {
    maxImpact?: number;
    allowedActionTypes?: string[];
    blockedActionTypes?: string[];
  };
};

export function canAutopilotExecute(policy: AutopilotPolicy, actionType: string, impact = 0) {
  if (!policy.enabled || policy.mode !== "automatic" || policy.approvalRequired) return false;
  if (policy.constraints?.allowedActionTypes?.length && !policy.constraints.allowedActionTypes.includes(actionType)) return false;
  if (policy.constraints?.blockedActionTypes?.includes(actionType)) return false;
  if (policy.constraints?.maxImpact != null && impact > policy.constraints.maxImpact) return false;
  return true;
}

export function rankAction(priority: Severity, impact: number, confidence = 1) {
  const weight: Record<Severity, number> = { info: 10, low: 25, medium: 50, high: 75, critical: 100 };
  return Math.round(weight[priority] * Math.max(0, Math.min(1, confidence)) + Math.max(0, Math.min(100, impact)));
}
