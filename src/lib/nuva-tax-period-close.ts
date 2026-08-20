export type TaxPeriodState = "open" | "review" | "ready_for_review" | "closed";

export type TaxPeriodCloseInput = {
  period: string;
  currentState: TaxPeriodState;
  reconciliationStatus: "blocked" | "review" | "ready_for_review";
  unresolvedBlockers: number;
  unresolvedWarnings: number;
  authorizedBy?: string;
};

export type TaxPeriodCloseResult = {
  state: TaxPeriodState;
  canClose: boolean;
  blockers: string[];
  warnings: string[];
};

export function evaluateTaxPeriodClose(input: TaxPeriodCloseInput): TaxPeriodCloseResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (input.currentState === "closed") return { state: "closed", canClose: false, blockers: ["El período ya está cerrado."], warnings: [] };
  if (input.reconciliationStatus === "blocked" || input.unresolvedBlockers > 0) blockers.push("Existen bloqueos de conciliación pendientes.");
  if (!input.authorizedBy) blockers.push("Se requiere un responsable autorizado para cerrar el período.");
  if (input.unresolvedWarnings > 0) warnings.push(`${input.unresolvedWarnings} advertencia(s) deben quedar documentadas antes del cierre.`);

  if (blockers.length) return { state: "review", canClose: false, blockers, warnings };
  if (input.reconciliationStatus === "review" || input.unresolvedWarnings > 0) return { state: "ready_for_review", canClose: false, blockers, warnings };
  return { state: "closed", canClose: true, blockers, warnings };
}

export function canEditClosedTaxPeriod(state: TaxPeriodState): boolean {
  return state !== "closed";
}
