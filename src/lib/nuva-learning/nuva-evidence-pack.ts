export type NuvaEvidencePack = {
  decisionId: string;
  businessId: string;
  createdAt: string;
  signal: string;
  evidence: Record<string, unknown>;
  agentsConsulted: string[];
  consensusConfidence: number;
  agreement: number;
  dissent: string[];
  recommendedAction?: string;
  guardianDecision?: "ALLOW" | "REVIEW" | "BLOCK";
  executionResult?: string;
  verificationPassed?: boolean;
};

export function createNuvaEvidencePack(
  input: Omit<NuvaEvidencePack, "createdAt">,
): NuvaEvidencePack {
  return { ...input, createdAt: new Date().toISOString() };
}
