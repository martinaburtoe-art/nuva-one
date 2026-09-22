export type SimulatorInput = {
  revenue: number;
  variableCost: number;
  fixedCost: number;
  priceChangePct: number;
  volumeChangePct: number;
};

export type SimulatorResult = {
  baselineRevenue: number;
  projectedRevenue: number;
  baselineProfit: number;
  projectedProfit: number;
  revenueDeltaPct: number;
  profitDeltaPct: number;
  marginPct: number;
};

export function simulateBusiness(input: SimulatorInput): SimulatorResult {
  const revenue = Math.max(0, input.revenue);
  const variable = Math.max(0, input.variableCost);
  const fixed = Math.max(0, input.fixedCost);
  const baselineProfit = revenue - variable - fixed;
  const projectedRevenue = revenue * (1 + input.priceChangePct / 100) * (1 + input.volumeChangePct / 100);
  const projectedVariable = variable * (1 + input.volumeChangePct / 100);
  const projectedProfit = projectedRevenue - projectedVariable - fixed;
  return {
    baselineRevenue: revenue,
    projectedRevenue,
    baselineProfit,
    projectedProfit,
    revenueDeltaPct: revenue ? ((projectedRevenue / revenue) - 1) * 100 : 0,
    profitDeltaPct: baselineProfit ? ((projectedProfit / baselineProfit) - 1) * 100 : 0,
    marginPct: projectedRevenue ? (projectedProfit / projectedRevenue) * 100 : 0,
  };
}
