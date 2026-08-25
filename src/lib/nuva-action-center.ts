export type ActionPriority = "critical" | "high" | "medium" | "opportunity";
export type ActionDestination =
  | "inventory"
  | "crm"
  | "purchases"
  | "finance"
  | "customers"
  | "dashboard";
export type ActionMode = "review" | "prepare";

export type NuvaAction = {
  id: string;
  priority: ActionPriority;
  title: string;
  reason: string;
  action: string;
  impact: number;
  destination: ActionDestination;
  cta: string;
  mode: ActionMode;
};

type Signal = {
  id: string;
  severity?: "critical" | "warning" | "opportunity" | "info";
  title: string;
  description: string;
  action?: string;
  recommendation?: string;
};

const priorityMap: Record<NonNullable<Signal["severity"]>, ActionPriority> = {
  critical: "critical",
  warning: "high",
  opportunity: "opportunity",
  info: "medium",
};
const destinationMap: Record<string, ActionDestination> = {
  "low-stock": "inventory",
  "receivables-overdue": "crm",
  "purchase-pressure": "purchases",
  "cash-burn": "finance",
  "growth-opportunity": "customers",
  tax: "finance",
  compliance: "finance",
  f29: "finance",
  dte: "finance",
  rcv: "finance",
};
const impactMap: Record<NonNullable<Signal["severity"]>, number> = {
  critical: 100,
  warning: 75,
  opportunity: 65,
  info: 40,
};
const ctaMap: Record<ActionDestination, string> = {
  inventory: "Revisar inventario",
  crm: "Gestionar cobranza",
  purchases: "Preparar compra",
  finance: "Revisar finanzas",
  customers: "Ver clientes",
  dashboard: "Revisar indicador",
};
const modeMap: Record<ActionDestination, ActionMode> = {
  inventory: "review",
  crm: "prepare",
  purchases: "prepare",
  finance: "review",
  customers: "prepare",
  dashboard: "review",
};

/** Converts analytical signals into a ranked action list. Execution is always explicit and user-confirmed. */
export function buildNuvaActionCenter(signals: Signal[], limit = 5): NuvaAction[] {
  return signals
    .filter((signal) => Boolean(signal?.title))
    .map((signal, index) => {
      const destination = destinationMap[signal.id] ?? "dashboard";
      const severity = signal.severity ?? "info";
      return {
        id: signal.id || `signal-${index}`,
        priority: priorityMap[severity],
        title: signal.title,
        reason: signal.description,
        action:
          signal.action || signal.recommendation || "Revisar este indicador y definir una acción.",
        impact: impactMap[severity],
        destination,
        cta: ctaMap[destination],
        mode: modeMap[destination],
      };
    })
    .sort((a, b) => b.impact - a.impact)
    .slice(0, Math.max(1, limit));
}
