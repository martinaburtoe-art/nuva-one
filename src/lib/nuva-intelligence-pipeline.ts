export type IntelligenceSignal = {
  id: string;
  module: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  impact: number;
  action: string;
};

export type IntelligenceAction = IntelligenceSignal & {
  rank: number;
  approvalRequired: boolean;
  rationale: string;
};

export function buildIntelligenceActions(
  signals: IntelligenceSignal[],
  limit = 5,
): IntelligenceAction[] {
  return [...signals]
    .filter(
      (signal) =>
        Number.isFinite(signal.confidence) && signal.confidence >= 0 && signal.confidence <= 100,
    )
    .sort((a, b) => {
      const severity = { critical: 4, high: 3, medium: 2, low: 1 };
      return (
        severity[b.severity] - severity[a.severity] ||
        b.confidence - a.confidence ||
        b.impact - a.impact
      );
    })
    .slice(0, limit)
    .map((signal, index) => ({
      ...signal,
      rank: index + 1,
      approvalRequired: signal.severity === "critical" || signal.impact >= 1000,
      rationale: `${signal.title}: confianza ${signal.confidence}%, impacto ${signal.impact}.`,
    }));
}
