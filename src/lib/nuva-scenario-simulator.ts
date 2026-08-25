export type ScenarioInput = {
  revenue: number;
  grossMargin: number;
  operatingExpenses: number;
  cash: number;
  inventory: number;
};

export type ScenarioChange = {
  revenuePct?: number;
  marginPct?: number;
  operatingExpensesPct?: number;
  cashAdjustment?: number;
  inventoryAdjustment?: number;
};

export type ScenarioResult = {
  baseline: {
    revenue: number;
    grossProfit: number;
    operatingResult: number;
    cash: number;
    inventory: number;
  };
  simulated: {
    revenue: number;
    grossProfit: number;
    operatingResult: number;
    cash: number;
    inventory: number;
  };
  deltas: {
    revenue: number;
    grossProfit: number;
    operatingResult: number;
    cash: number;
    inventory: number;
  };
  risk: "critical" | "high" | "medium" | "low";
};

const round = (n: number) => Math.round(n * 100) / 100;

export function simulateBusinessScenario(
  input: ScenarioInput,
  change: ScenarioChange,
): ScenarioResult {
  const baselineGrossProfit = input.revenue * input.grossMargin;
  const baselineOperatingResult = baselineGrossProfit - input.operatingExpenses;
  const revenue = input.revenue * (1 + (change.revenuePct ?? 0) / 100);
  const grossMargin = Math.max(0, Math.min(1, input.grossMargin + (change.marginPct ?? 0) / 100));
  const operatingExpenses =
    input.operatingExpenses * (1 + (change.operatingExpensesPct ?? 0) / 100);
  const simulated = {
    revenue: round(revenue),
    grossProfit: round(revenue * grossMargin),
    operatingResult: round(revenue * grossMargin - operatingExpenses),
    cash: round(input.cash + (change.cashAdjustment ?? 0)),
    inventory: round(Math.max(0, input.inventory + (change.inventoryAdjustment ?? 0))),
  };
  const baseline = {
    revenue: round(input.revenue),
    grossProfit: round(baselineGrossProfit),
    operatingResult: round(baselineOperatingResult),
    cash: round(input.cash),
    inventory: round(input.inventory),
  };
  const deltas = {
    revenue: round(simulated.revenue - baseline.revenue),
    grossProfit: round(simulated.grossProfit - baseline.grossProfit),
    operatingResult: round(simulated.operatingResult - baseline.operatingResult),
    cash: round(simulated.cash - baseline.cash),
    inventory: round(simulated.inventory - baseline.inventory),
  };
  const risk =
    simulated.cash < 0 || simulated.operatingResult < 0
      ? "critical"
      : simulated.cash < input.cash * 0.5
        ? "high"
        : deltas.operatingResult < 0
          ? "medium"
          : "low";
  return { baseline, simulated, deltas, risk };
}
