export type WarningSignal = {
  id: string;
  module: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  impact: number;
  action: string;
};

export type EarlyWarning = WarningSignal & {
  horizon: "immediate" | "short_term" | "medium_term";
  status: "watch" | "act";
};

export function buildEarlyWarnings(signals: WarningSignal[]): EarlyWarning[] {
  return signals
    .filter((signal) => Number.isFinite(signal.confidence) && signal.confidence >= 60)
    .map((signal) => ({
      ...signal,
      horizon: signal.severity === "critical" ? "immediate" : signal.severity === "high" ? "short_term" : "medium_term",
      status: signal.severity === "critical" || signal.severity === "high" ? "act" : "watch",
    }));
}
