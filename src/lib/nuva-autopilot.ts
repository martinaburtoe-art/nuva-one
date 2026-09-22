export type AutopilotLevel = "observe" | "recommend" | "prepare" | "approve" | "automatic";

export type AutopilotAction = {
  id: string;
  label: string;
  risk: "low" | "medium" | "high";
  requiresApproval: boolean;
  allowedAt: AutopilotLevel;
};

const order: Record<AutopilotLevel, number> = {
  observe: 0,
  recommend: 1,
  prepare: 2,
  approve: 3,
  automatic: 4,
};

export const AUTOPILOT_DEFAULTS: AutopilotAction[] = [
  { id: "draft-message", label: "Preparar mensaje comercial", risk: "low", requiresApproval: false, allowedAt: "prepare" },
  { id: "create-task", label: "Crear tarea de seguimiento", risk: "low", requiresApproval: false, allowedAt: "prepare" },
  { id: "prepare-purchase", label: "Preparar orden de compra", risk: "medium", requiresApproval: true, allowedAt: "approve" },
  { id: "send-message", label: "Enviar comunicación externa", risk: "medium", requiresApproval: true, allowedAt: "approve" },
  { id: "post-finance", label: "Registrar movimiento financiero", risk: "high", requiresApproval: true, allowedAt: "approve" },
];

export function canAutopilotExecute(action: AutopilotAction, level: AutopilotLevel) {
  if (order[level] < order[action.allowedAt]) return false;
  return !action.requiresApproval || level === "approve" || level === "automatic";
}

export function describeAutopilot(level: AutopilotLevel) {
  return {
    observe: "Nüva observa y explica.",
    recommend: "Nüva recomienda qué hacer.",
    prepare: "Nüva prepara acciones sin ejecutarlas.",
    approve: "Nüva ejecuta acciones autorizadas después de aprobación.",
    automatic: "Nüva ejecuta reglas previamente autorizadas y auditables.",
  }[level];
}
