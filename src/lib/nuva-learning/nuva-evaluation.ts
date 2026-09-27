export type NuvaScenario = {
  id: string;
  name: string;
  input: Record<string, unknown>;
  expectedSignal: string;
};

export type NuvaScenarioResult = NuvaScenario & {
  passed: boolean;
  actualSignal: string | null;
};

export function evaluateNuvaScenarios(
  scenarios: NuvaScenario[],
  resolver: (input: Record<string, unknown>) => string | null,
): NuvaScenarioResult[] {
  return scenarios.map((scenario) => {
    const actualSignal = resolver(scenario.input);
    return { ...scenario, actualSignal, passed: actualSignal === scenario.expectedSignal };
  });
}
