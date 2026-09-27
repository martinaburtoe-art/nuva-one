import type { NuvaAgentFinding } from "../nuva-intelligence-agent-council";
import { calculateNuvaTrust } from "./nuva-trust-engine";
import { reviewNuvaAction } from "./nuva-guardian";

export function evaluateNuvaFinding(finding: NuvaAgentFinding) {
  const trust = calculateNuvaTrust({
    confidence: finding.confidence,
    evidenceQuality: finding.evidenceQuality,
    dataFreshness: 0.9,
    agentAgreement: 0.8,
    historicalAccuracy: 0.7,
    previousOutcomeQuality: 0.7,
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
