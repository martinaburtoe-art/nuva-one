import {
  buildNuvaIntelligence,
  type IntelligenceSignal,
  type IntelligenceSeverity,
} from "./nuva-intelligence";
import { buildNuvaActionCenter, type NuvaAction } from "./nuva-action-center";

export type NuvaDecision = {
  score: number;
  status: "critical" | "attention" | "opportunity" | "stable";
  headline: string;
  topSignal: IntelligenceSignal;
  actions: NuvaAction[];
  signals: IntelligenceSignal[];
};

const weight: Record<IntelligenceSeverity, number> = {
  critical: 4,
  warning: 3,
  opportunity: 2,
  info: 1,
};

/** Single source of truth for executive priority. All surfaces should consume this result. */
export function buildNuvaDecision(
  input: Parameters<typeof buildNuvaIntelligence>[0],
  actionLimit = 5,
): NuvaDecision {
  const signals = buildNuvaIntelligence(input);
  const topSignal = signals[0];
  if (!topSignal) {
    throw new Error("Nüva Decision Engine requires at least one intelligence signal");
  }
  const critical = signals.filter((s) => s.severity === "critical").length;
  const warning = signals.filter((s) => s.severity === "warning").length;
  const opportunity = signals.filter((s) => s.severity === "opportunity").length;
  const raw = critical * 30 + warning * 15 + opportunity * 5;
  const score = Math.min(100, raw);
  const status = critical
    ? "critical"
    : warning
      ? "attention"
      : opportunity
        ? "opportunity"
        : "stable";
  const headline = critical
    ? "Hay decisiones críticas que requieren atención hoy."
    : warning
      ? "Hay puntos de atención que conviene resolver hoy."
      : opportunity
        ? "Nüva detectó oportunidades para mejorar el negocio."
        : "El negocio se encuentra estable con los datos disponibles.";
  return {
    score,
    status,
    headline,
    topSignal,
    actions: buildNuvaActionCenter(signals, actionLimit),
    signals,
  };
}

export const decisionPriority = (signal: IntelligenceSignal) => weight[signal.severity];
