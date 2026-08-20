export type ActionPriority = "critical" | "high" | "medium" | "opportunity";

export type NuvaAction = {
  id: string;
  priority: ActionPriority;
  title: string;
  reason: string;
  action: string;
  impact: number;
};

type Signal = {
  id: string;
  severity?: "critical" | "warning" | "opportunity" | "info";
  title: string;
  description: string;
  recommendation?: string;
};

const priorityMap: Record<NonNullable<Signal["severity"]>, ActionPriority> = {
  critical: "critical",
  warning: "high",
  opportunity: "opportunity",
  info: "medium",
};

/** Converts analytical signals into a short, ranked action list for the owner. */
export function buildNuvaActionCenter(signals: Signal[], limit = 5): NuvaAction[] {
  return signals
    .filter((signal) => signal && signal.title)
    .map((signal, index) => ({
      id: signal.id || `signal-${index}`,
      priority: priorityMap[signal.severity ?? "info"],
      title: signal.title,
      reason: signal.description,
      action: signal.recommendation || "Revisar este indicador y definir una acción.",
      impact: signal.severity === "critical" ? 100 : signal.severity === "warning" ? 75 : signal.severity === "opportunity" ? 65 : 40,
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, Math.max(1, limit));
}
