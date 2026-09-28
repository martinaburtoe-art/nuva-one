import type { Action, AgencyAgentDefinition, AgencyRisk, Incident } from "./types";
import { evaluateAction } from "./policy";

export type RemediationKind =
  | "retry_ci_failure"
  | "refresh_preview"
  | "rebuild_generated_artifact";

type Candidate = {
  kind: RemediationKind;
  description: string;
  agentId: string;
  risk: AgencyRisk;
  reversible: boolean;
  verificationPlan: string[];
};

const candidates: Record<RemediationKind, Candidate> = {
  retry_ci_failure: {
    kind: "retry_ci_failure",
    description: "Retry the failed CI workflow once.",
    agentId: "devops",
    risk: "LOW",
    reversible: true,
    verificationPlan: [
      "The retried workflow must complete successfully.",
      "No new failed workflow may appear for the same commit.",
    ],
  },
  refresh_preview: {
    kind: "refresh_preview",
    description: "Recreate a disposable preview deployment.",
    agentId: "devops",
    risk: "LOW",
    reversible: true,
    verificationPlan: [
      "Preview deployment reaches READY.",
      "Web QA passes against the preview URL.",
    ],
  },
  rebuild_generated_artifact: {
    kind: "rebuild_generated_artifact",
    description: "Regenerate a disposable generated artifact.",
    agentId: "engineering",
    risk: "LOW",
    reversible: true,
    verificationPlan: [
      "Artifact checksum changes as expected.",
      "Typecheck and tests remain green.",
    ],
  },
};

export function proposeRemediation(
  incident: Incident,
  kind: RemediationKind,
  agent: AgencyAgentDefinition,
): Action | null {
  const candidate = candidates[kind];

  if (!candidate || agent.id !== candidate.agentId) return null;
  if (incident.severity === "HIGH" || incident.severity === "CRITICAL") return null;

  const action: Action = {
    id: `action-${incident.fingerprint}-${kind}`,
    incidentId: incident.id,
    agentId: agent.id,
    description: candidate.description,
    risk: candidate.risk,
    autonomyLevel: agent.defaultAutonomy,
    reversible: candidate.reversible,
    requiresApproval: false,
    verificationPlan: candidate.verificationPlan,
    status: "PROPOSED",
  };

  const decision = evaluateAction(action);
  return decision.allowed ? action : null;
}

export function listRemediationKinds(): RemediationKind[] {
  return Object.keys(candidates) as RemediationKind[];
}
