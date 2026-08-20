export type AdjustmentState = "requested" | "approved" | "rejected" | "applied" | "revalidated";

export type TaxAdjustmentRequest = {
  id: string;
  period: string;
  reason: string;
  entityId: string;
  impact: number;
  requestedBy: string;
  state: AdjustmentState;
};

export type TaxAdjustmentResult = { allowed: boolean; nextState: AdjustmentState; blockers: string[] };

export function transitionTaxAdjustment(input: TaxAdjustmentRequest, target: AdjustmentState, actor?: string): TaxAdjustmentResult {
  const blockers: string[] = [];
  if (!actor) blockers.push("Se requiere un actor autorizado.");
  if (!input.reason.trim()) blockers.push("La corrección debe tener un motivo.");
  if (input.impact === 0) blockers.push("La corrección debe declarar un impacto distinto de cero.");

  const allowedTransitions: Record<AdjustmentState, AdjustmentState[]> = {
    requested: ["approved", "rejected"],
    approved: ["applied", "rejected"],
    rejected: [],
    applied: ["revalidated"],
    revalidated: [],
  };

  if (!allowedTransitions[input.state].includes(target)) blockers.push(`Transición inválida: ${input.state} → ${target}.`);
  return blockers.length ? { allowed: false, nextState: input.state, blockers } : { allowed: true, nextState: target, blockers: [] };
}
