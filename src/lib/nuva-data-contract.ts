export type BusinessModule = "cashflow" | "sales" | "inventory" | "purchases" | "crm";

export type BusinessMetric = {
  id: string;
  module: BusinessModule;
  name: string;
  value: number;
  unit?: string;
  period?: string;
  source?: string;
};

export type BusinessSignal = {
  id: string;
  module: BusinessModule;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  impact: number;
  action: string;
  entityId?: string;
  period?: string;
};

export function normalizeMetric(metric: BusinessMetric): BusinessMetric {
  return {
    ...metric,
    value: Number.isFinite(metric.value) ? metric.value : 0,
    unit: metric.unit?.trim() || undefined,
    period: metric.period?.trim() || undefined,
    source: metric.source?.trim() || undefined,
  };
}

export function normalizeSignals(signals: BusinessSignal[]): BusinessSignal[] {
  return signals
    .filter((signal) => Number.isFinite(signal.confidence) && signal.confidence >= 0 && signal.confidence <= 100)
    .map((signal) => ({
      ...signal,
      confidence: Math.round(signal.confidence),
      impact: Number.isFinite(signal.impact) ? signal.impact : 0,
      title: signal.title.trim(),
      action: signal.action.trim(),
    }))
    .filter((signal) => signal.title.length > 0 && signal.action.length > 0);
}
