import { calculateRegulatoryReadiness, getRegulatoryRules, type RegulatorySeverity } from "./nuva-regulatory-radar";

export type RegulatoryAction = {
  id: string;
  priority: "critical" | "high" | "medium" | "opportunity";
  title: string;
  reason: string;
  impact: number;
  action: string;
  authority: string;
  effectiveFrom: string;
  missing: string[];
  mode: "review" | "prepare";
};

const priority: Record<RegulatorySeverity, RegulatoryAction["priority"]> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "opportunity",
};

const impact: Record<RegulatorySeverity, number> = {
  critical: 100,
  high: 80,
  medium: 60,
  low: 35,
};

/** Converts regulatory gaps into explicit, user-confirmed work items. It never executes regulated operations. */
export function buildRegulatoryActions(implementedCapabilities: Iterable<string>, now = new Date()): RegulatoryAction[] {
  const { results } = calculateRegulatoryReadiness(implementedCapabilities, getRegulatoryRules(now));
  return results
    .filter(({ missing }) => missing.length > 0)
    .map(({ rule, readiness, missing }) => ({
      id: `regulatory-${rule.id}`,
      priority: priority[rule.severity],
      title: `${rule.title}: preparación ${readiness}%`,
      reason: `Faltan ${missing.length} capacidades: ${missing.join(", ")}.`,
      impact: impact[rule.severity],
      action: `Preparar plan de cumplimiento para ${rule.title}.`,
      authority: rule.authority,
      effectiveFrom: rule.effectiveFrom,
      missing,
      mode: "prepare",
    }))
    .sort((a, b) => b.impact - a.impact || a.effectiveFrom.localeCompare(b.effectiveFrom));
}
