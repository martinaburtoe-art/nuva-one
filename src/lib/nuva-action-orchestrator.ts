export type ActionPriority = "critical" | "high" | "medium" | "low";

export type ActionSignal = {
  id: string;
  module: string;
  title: string;
  priority: ActionPriority;
  impact: number;
  action: string;
  requiresApproval?: boolean;
};

export type NextBestAction = ActionSignal & { rank: number; rationale: string };

const priorityWeight: Record<ActionPriority, number> = {
  critical: 100,
  high: 70,
  medium: 40,
  low: 15,
};

export function buildNextBestActions(signals: ActionSignal[], limit = 5): NextBestAction[] {
  return [...signals]
    .sort(
      (a, b) =>
        priorityWeight[b.priority] - priorityWeight[a.priority] ||
        Math.max(0, b.impact) - Math.max(0, a.impact),
    )
    .slice(0, limit)
    .map((signal, index) => ({
      ...signal,
      rank: index + 1,
      rationale: `${signal.priority.toUpperCase()}: ${signal.title}. Impacto estimado ${signal.impact}.`,
    }));
}
