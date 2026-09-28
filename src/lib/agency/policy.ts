import type { Action, AgencyAutonomyLevel, AgencyRisk } from "./types";

const riskRank: Record<AgencyRisk, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
const autonomyRank: Record<AgencyAutonomyLevel, number> = {
  L0_OBSERVE: 0,
  L1_RECOMMEND: 1,
  L2_CONTROLLED_AUTOHEAL: 2,
  L3_AUTONOMOUS_ENGINEERING: 3,
  L4_STRATEGIC: 4,
};

export interface AgencyPolicyDecision {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
}

export function evaluateAction(action: Action): AgencyPolicyDecision {
  if (!action.verificationPlan.length) {
    return { allowed: false, reason: "No verification plan exists.", requiresApproval: true };
  }

  if (!action.reversible && action.risk !== "LOW") {
    return { allowed: false, reason: "Non-reversible actions above LOW risk require explicit approval.", requiresApproval: true };
  }

  if (riskRank[action.risk] >= riskRank.HIGH) {
    return { allowed: false, reason: "HIGH/CRITICAL actions are approval-gated.", requiresApproval: true };
  }

  if (action.autonomyLevel === "L2_CONTROLLED_AUTOHEAL" && !action.reversible) {
    return { allowed: false, reason: "Controlled auto-heal requires reversibility.", requiresApproval: true };
  }

  if (autonomyRank[action.autonomyLevel] < autonomyRank.L2_CONTROLLED_AUTOHEAL) {
    return { allowed: false, reason: "Current autonomy level is observation/recommendation only.", requiresApproval: true };
  }

  return { allowed: true, reason: "Action satisfies the default Nüva Agency policy.", requiresApproval: false };
}
