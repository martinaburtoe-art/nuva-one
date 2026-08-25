import type { NuvaAction } from "./nuva-action-center";

export type ActionExecutionStatus = "blocked" | "ready" | "approved" | "completed";

export type ActionExecutionRequest = {
  action: NuvaAction;
  businessId: string;
  actorUserId: string;
  approved: boolean;
  idempotencyKey: string;
};

export type ActionExecutionPlan = {
  status: ActionExecutionStatus;
  reason: string;
  requiresExplicitApproval: boolean;
  auditRequired: true;
};

/**
 * Policy-only layer. It never performs the business mutation itself.
 * Server routes/functions must enforce membership, permissions and idempotency
 * before executing the approved operation.
 */
export function planActionExecution(request: ActionExecutionRequest): ActionExecutionPlan {
  const { action, businessId, actorUserId, idempotencyKey, approved } = request;

  if (!businessId || !actorUserId) {
    return {
      status: "blocked",
      reason: "Falta contexto autenticado del negocio o usuario.",
      requiresExplicitApproval: true,
      auditRequired: true,
    };
  }

  if (!idempotencyKey || idempotencyKey.trim().length < 12) {
    return {
      status: "blocked",
      reason: "Se requiere una clave de idempotencia válida.",
      requiresExplicitApproval: true,
      auditRequired: true,
    };
  }

  const requiresApproval = action.priority === "critical" || action.mode === "prepare";

  if (requiresApproval && !approved) {
    return {
      status: "ready",
      reason: "La acción está preparada y espera aprobación explícita.",
      requiresExplicitApproval: true,
      auditRequired: true,
    };
  }

  return {
    status: "approved",
    reason:
      "La acción superó el filtro de política; la ejecución debe ocurrir en una ruta autorizada del servidor.",
    requiresExplicitApproval: requiresApproval,
    auditRequired: true,
  };
}
