import type { NuvaAgentFinding } from "../nuva-intelligence-agent-council";
import { calculateNuvaTrust } from "./nuva-trust-engine";
import { reviewNuvaAction } from "./nuva-guardian";

export type NuvaMeasuredMetrics = {
  dataFreshness?: number;
  agentAgreement?: number;
  historicalAccuracy?: number;
  previousOutcomeQuality?: number;
};

const bounded = (value: number | undefined, fallback: number) =>
  Math.min(1, Math.max(0, value ?? fallback));

export function evaluateNuvaFinding(
  finding: NuvaAgentFinding,
  metrics: NuvaMeasuredMetrics = {},
) {
  const trust = calculateNuvaTrust({
    confidence: finding.confidence,
    evidenceQuality: finding.evidenceQuality,
    dataFreshness: bounded(metrics.dataFreshness, 0.5),
    agentAgreement: bounded(metrics.agentAgreement, 0.5),
    historicalAccuracy: bounded(metrics.historicalAccuracy, 0.5),
    previousOutcomeQuality: bounded(metrics.previousOutcomeQuality, 0.5),
  });

  const guardian = reviewNuvaAction({
    actionId: finding.signalKey,
    requiresApproval: finding.requiresApproval,
    reversible: finding.proposal?.mode !== "prepare",
    permissionGranted: true,
    duplicateDetected: false,
    evidenceComplete: Object.keys(finding.evidence).length > 0,
    trust,
  });

  return { trust, guardian };
}
