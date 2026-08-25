export type PulseSeverity = "critical" | "high" | "medium" | "low" | "healthy";

export type PulseSignal = {
  id: string;
  module: string;
  title: string;
  severity: Exclude<PulseSeverity, "healthy">;
  impact: number;
  action: string;
};

export type OperatingPulse = {
  score: number;
  status: PulseSeverity;
  primaryAction: string | null;
  signals: PulseSignal[];
};

const weight: Record<PulseSignal["severity"], number> = {
  critical: 30,
  high: 20,
  medium: 10,
  low: 5,
};

export function buildOperatingPulse(signals: PulseSignal[], maxSignals = 5): OperatingPulse {
  const ordered = [...signals]
    .sort((a, b) => weight[b.severity] - weight[a.severity] || b.impact - a.impact)
    .slice(0, maxSignals);
  const penalty = Math.min(
    100,
    ordered.reduce((sum, signal) => sum + weight[signal.severity], 0),
  );
  const score = Math.max(0, 100 - penalty);
  const status: PulseSeverity =
    score < 40
      ? "critical"
      : score < 60
        ? "high"
        : score < 80
          ? "medium"
          : score < 95
            ? "low"
            : "healthy";
  return { score, status, primaryAction: ordered[0]?.action ?? null, signals: ordered };
}
