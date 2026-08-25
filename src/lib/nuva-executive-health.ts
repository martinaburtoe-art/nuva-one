export type ExecutiveMetric = {
  key: string;
  label: string;
  value: number;
  target: number;
  weight: number;
  higherIsBetter?: boolean;
};

export type ExecutiveHealth = {
  score: number;
  status: "critical" | "attention" | "healthy";
  metrics: Array<ExecutiveMetric & { score: number }>;
  weakestMetric: string | null;
};

function metricScore(metric: ExecutiveMetric): number {
  if (!Number.isFinite(metric.value) || !Number.isFinite(metric.target) || metric.target === 0)
    return 0;
  const ratio =
    metric.higherIsBetter === false
      ? metric.target / Math.max(metric.value, 0.000001)
      : metric.value / metric.target;
  return Math.max(0, Math.min(100, ratio * 100));
}

export function buildExecutiveHealth(metrics: ExecutiveMetric[]): ExecutiveHealth {
  const scored = metrics.map((metric) => ({ ...metric, score: metricScore(metric) }));
  const totalWeight = scored.reduce((sum, metric) => sum + Math.max(metric.weight, 0), 0);
  const score =
    totalWeight === 0
      ? 100
      : Math.round(
          scored.reduce((sum, metric) => sum + metric.score * Math.max(metric.weight, 0), 0) /
            totalWeight,
        );
  const weakestMetric = scored.length
    ? [...scored].sort((a, b) => a.score - b.score)[0].label
    : null;
  const status = score < 50 ? "critical" : score < 75 ? "attention" : "healthy";
  return { score, status, metrics: scored, weakestMetric };
}
