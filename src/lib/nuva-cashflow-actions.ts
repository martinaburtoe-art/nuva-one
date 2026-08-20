export type CashflowActionPriority = "critical" | "high" | "medium";

export type CashflowAction = {
  id: string;
  priority: CashflowActionPriority;
  title: string;
  rationale: string;
  mode: "review" | "prepare";
};

export type CashflowActionInput = {
  projectedMinimum: number;
  deficitDay?: number | null;
  overdueReceivables?: number;
  discretionaryPayables?: number;
};

export function buildCashflowActions(input: CashflowActionInput): CashflowAction[] {
  const actions: CashflowAction[] = [];
  const overdue = Math.max(0, input.overdueReceivables ?? 0);
  const discretionary = Math.max(0, input.discretionaryPayables ?? 0);

  if (input.projectedMinimum < 0) {
    actions.push({
      id: "liquidity-deficit",
      priority: "critical",
      title: "Preparar plan de liquidez",
      rationale: input.deficitDay
        ? `La caja proyectada entra en déficit alrededor del día ${input.deficitDay}.`
        : "La caja proyectada alcanza un saldo negativo.",
      mode: "prepare",
    });
  }

  if (overdue > 0) {
    actions.push({
      id: "collections",
      priority: input.projectedMinimum < 0 ? "high" : "medium",
      title: "Revisar cobranza prioritaria",
      rationale: `Existen $${Math.round(overdue).toLocaleString("es-CL")} en cuentas por cobrar vencidas.`,
      mode: "prepare",
    });
  }

  if (discretionary > 0 && input.projectedMinimum < 0) {
    actions.push({
      id: "discretionary-spend",
      priority: "high",
      title: "Revisar egresos discrecionales",
      rationale: `Hay $${Math.round(discretionary).toLocaleString("es-CL")} de egresos marcados como discrecionales en el período de riesgo.`,
      mode: "review",
    });
  }

  return actions;
}
