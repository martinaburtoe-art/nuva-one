import { createNuvaEvidencePack } from "./nuva-evidence-pack";
import { updateNuvaInstinct, type NuvaInstinct } from "./nuva-instincts";
import { persistNuvaEvidencePack, persistNuvaInstinct } from "./nuva-persistence";
import { verifyNuvaAction } from "./nuva-verification";

export async function recordAndPersistNuvaOutcome(input: {
  decisionId: string;
  businessId: string;
  signal: string;
  evidence: Record<string, unknown>;
  agentsConsulted: string[];
  consensusConfidence: number;
  agreement: number;
  recommendedAction?: string;
  guardianDecision: "ALLOW" | "REVIEW" | "BLOCK";
  executionSucceeded: boolean;
  resultValid: boolean;
  instinct?: NuvaInstinct | null;
}) {
  const verification = verifyNuvaAction(
    true,
    input.guardianDecision !== "BLOCK",
    input.executionSucceeded,
    input.resultValid,
  );

  const instinct = input.instinct
    ? updateNuvaInstinct(input.instinct, verification.passed)
    : null;

  const evidencePack = createNuvaEvidencePack({
    decisionId: input.decisionId,
    businessId: input.businessId,
    signal: input.signal,
    evidence: input.evidence,
    agentsConsulted: input.agentsConsulted,
    consensusConfidence: input.consensusConfidence,
    agreement: input.agreement,
    dissent: [],
    recommendedAction: input.recommendedAction,
    guardianDecision: input.guardianDecision,
    executionResult: input.executionSucceeded ? "success" : "failed",
    verificationPassed: verification.passed,
  });

  await persistNuvaEvidencePack(evidencePack);
  if (instinct) await persistNuvaInstinct(input.businessId, instinct);

  return { verification, instinct, evidencePack };
}
