export const AGENCY_WORKER_REPO = "martinaburtoe-art/nuva-one";
export const AGENCY_WORKER_OWNER = "martinaburtoe-art";
export const AGENCY_WORKER_AUDIENCE = "nuva-one-agency";
export const AGENCY_WORKER_WORKFLOW_REF =
  "martinaburtoe-art/nuva-one/.github/workflows/nuva-agent-durable-worker.yml@refs/heads/main";

export const AGENCY_WORKER_AGENT_IDS = [
  "orchestrator",
  "constructor",
  "finance",
  "sales",
  "supply",
  "people",
  "compliance",
  "growth",
  "security",
  "qa",
  "sentinel",
  "ux",
  "release",
] as const;

const ALLOWED_EVENTS = new Set(["schedule", "workflow_dispatch", "push"]);

export function isTrustedAgencyWorkerClaims(
  payload: Record<string, unknown>,
  runId: string,
  agentId: string,
): boolean {
  const jobWorkflowRef = payload.job_workflow_ref;
  return (
    payload.aud === AGENCY_WORKER_AUDIENCE &&
    payload.repository === AGENCY_WORKER_REPO &&
    payload.repository_owner === AGENCY_WORKER_OWNER &&
    String(payload.run_id ?? "") === runId &&
    /^\d+$/.test(runId) &&
    Number(runId) > 0 &&
    payload.ref === "refs/heads/main" &&
    payload.workflow_ref === AGENCY_WORKER_WORKFLOW_REF &&
    (jobWorkflowRef === undefined || jobWorkflowRef === AGENCY_WORKER_WORKFLOW_REF) &&
    payload.actor === AGENCY_WORKER_OWNER &&
    ALLOWED_EVENTS.has(String(payload.event_name ?? "")) &&
    AGENCY_WORKER_AGENT_IDS.includes(agentId as (typeof AGENCY_WORKER_AGENT_IDS)[number])
  );
}
