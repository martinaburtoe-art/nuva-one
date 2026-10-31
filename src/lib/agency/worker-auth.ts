export const AGENCY_DURABLE_WORKER_WORKFLOW_PATH = ".github/workflows/nuva-agency-durable-worker.yml";
export const AGENCY_WORKER_REPOSITORY = "martinaburtoe-art/nuva-one";

export type TrustedAgencyWorkerRun = {
  id?: number;
  status?: string | null;
  path?: string | null;
  event?: string | null;
  head_branch?: string | null;
  repository?: { full_name?: string | null };
  actor?: { login?: string | null };
};

export function isTrustedAgencyWorkerRun(run: unknown, runId: string): boolean {
  if (!run || typeof run !== "object" || !/^[0-9]+$/.test(runId)) return false;
  const candidate = run as TrustedAgencyWorkerRun;
  const expectedId = Number(runId);
  const workflowPath = (candidate.path ?? "").split("@", 1)[0];

  return Number.isSafeInteger(expectedId)
    && expectedId > 0
    && candidate.id === expectedId
    && candidate.repository?.full_name === AGENCY_WORKER_REPOSITORY
    && candidate.status === "in_progress"
    && workflowPath === AGENCY_DURABLE_WORKER_WORKFLOW_PATH
    && candidate.head_branch === "main"
    && ["schedule", "workflow_dispatch"].includes(candidate.event ?? "")
    && candidate.actor?.login === "martinaburtoe-art";
}
