import type { NuvaTrustResult } from "./nuva-trust-engine";

export type NuvaGuardianDecision = "ALLOW" | "REVIEW" | "BLOCK";

export type NuvaGuardianInput = {
  actionId: string;
  requiresApproval: boolean;
  reversible: boolean;
  permissionGranted: boolean;
  duplicateDetected: boolean;
  evidenceComplete: boolean;
  trust: NuvaTrustResult;
};

export type NuvaGuardianResult = {
  decision: NuvaGuardianDecision;
  reasons: string[];
};

export function reviewNuvaAction(input: NuvaGuardianInput): NuvaGuardianResult {
  const reasons: string[] = [];

  if (!input.permissionGranted) reasons.push("La acción no tiene autorización suficiente.");
  if (input.duplicateDetected) reasons.push("Se detectó una acción equivalente reciente.");
  if (!input.evidenceComplete) reasons.push("La evidencia requerida está incompleta.");
  if (input.trust.level === "observe") reasons.push("La confianza no permite preparar una acción.");
  if (input.requiresApproval) reasons.push("La acción requiere aprobación explícita.");

  if (!input.permissionGranted || input.duplicateDetected) {
    return { decision: "BLOCK", reasons };
  }

  if (!input.evidenceComplete || input.trust.level === "observe" || input.requiresApproval) {
    return { decision: "REVIEW", reasons };
  }

  if (!input.reversible && !input.trust.canExecuteAction) {
    return { decision: "REVIEW", reasons: ["La acción es irreversible y la confianza actual no permite ejecutarla."] };
  }

  return { decision: "ALLOW", reasons: ["Autorización, evidencia, confianza y controles de duplicación verificados."] };
}
