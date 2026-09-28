export type NuvaTrustInput = {
  confidence: number;
  evidenceQuality: "high" | "medium" | "low";
  dataFreshness: number;
  agentAgreement: number;
  historicalAccuracy: number;
  previousOutcomeQuality: number;
};

export type NuvaTrustLevel = "high" | "medium" | "low" | "observe";

export type NuvaTrustResult = {
  score: number;
  level: NuvaTrustLevel;
  canPrepareAction: boolean;
  canExecuteAction: boolean;
  reasons: string[];
};

export function calculateNuvaTrust(input: NuvaTrustInput): NuvaTrustResult {
  const evidence = input.evidenceQuality === "high" ? 1 : input.evidenceQuality === "medium" ? 0.75 : 0.45;
  const score = Math.round(
    (input.confidence * 0.25 +
      evidence * 0.15 +
      input.dataFreshness * 0.15 +
      input.agentAgreement * 0.15 +
      input.historicalAccuracy * 0.15 +
      input.previousOutcomeQuality * 0.15) * 100,
  );

  const level: NuvaTrustLevel =
    score >= 85 ? "high" : score >= 70 ? "medium" : score >= 50 ? "low" : "observe";

  return {
    score,
    level,
    canPrepareAction: score >= 70,
    canExecuteAction: score >= 85,
    reasons: [
      `Confianza de señal: ${Math.round(input.confidence * 100)}%.`,
      `Acuerdo del consejo: ${Math.round(input.agentAgreement * 100)}%.`,
      `Frescura de datos: ${Math.round(input.dataFreshness * 100)}%.`,
    ],
  };
}
