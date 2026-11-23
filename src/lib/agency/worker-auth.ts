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

export type TrustedAgencyWorkerRunDenialReason =
  | "invalid_run_payload"
  | "invalid_run_id"
  | "run_id_mismatch"
  | "repository_mismatch"
  | "run_not_in_progress"
  | "workflow_path_mismatch"
  | "head_branch_mismatch"
  | "event_not_allowed"
  | "actor_mismatch";

export type AgencyWorkerRunDiagnosticDetails = {
  runStatus: string | null;
  workflowPath: string | null;
  event: string | null;
  headBranch: string | null;
  repository: string | null;
  actor: string | null;
  returnedRunId: number | null;
};

const emptyRunDiagnostics: AgencyWorkerRunDiagnosticDetails = {
  runStatus: null,
  workflowPath: null,
  event: null,
  headBranch: null,
  repository: null,
  actor: null,
  returnedRunId: null,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function boundedDiagnosticText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;

  let normalized = "";
  let length = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    const isControl = codePoint <= 0x1f
      || (codePoint >= 0x7f && codePoint <= 0x9f)
      || codePoint === 0x2028
      || codePoint === 0x2029;
    normalized += isControl ? " " : character;
    length += 1;
    if (length >= maxLength) break;
  }

  const bounded = normalized.trim();
  return bounded || null;
}

/**
 * Extract only bounded, non-secret GitHub run metadata for denial logs.
 * Malformed or oversized API fields must remain diagnosable without allowing
 * control-character log injection or unbounded log payloads.
 */
export function agencyWorkerRunDiagnosticDetails(run: unknown): AgencyWorkerRunDiagnosticDetails {
  const candidate = asRecord(run);
  if (!candidate) return { ...emptyRunDiagnostics };

  const repository = asRecord(candidate.repository);
  const actor = asRecord(candidate.actor);

  return {
    runStatus: boundedDiagnosticText(candidate.status, 32),
    workflowPath: boundedDiagnosticText(candidate.path, 256),
    event: boundedDiagnosticText(candidate.event, 64),
    headBranch: boundedDiagnosticText(candidate.head_branch, 256),
    repository: boundedDiagnosticText(repository?.full_name, 256),
    actor: boundedDiagnosticText(actor?.login, 128),
    returnedRunId: typeof candidate.id === "number" && Number.isSafeInteger(candidate.id)
      ? candidate.id
      : null,
  };
}

export function agencyWorkerRunDenialReason(
  run: unknown,
  runId: string,
): TrustedAgencyWorkerRunDenialReason | null {
  const candidate = asRecord(run);
  if (!candidate) return "invalid_run_payload";
  if (!/^[0-9]+$/.test(runId)) return "invalid_run_id";

  const expectedId = Number(runId);
  if (!Number.isSafeInteger(expectedId) || expectedId <= 0) return "invalid_run_id";
  if (candidate.id !== expectedId) return "run_id_mismatch";
  const repository = asRecord(candidate.repository);
  if (repository?.full_name !== AGENCY_WORKER_REPOSITORY) return "repository_mismatch";
  if (candidate.status !== "in_progress") return "run_not_in_progress";

  const workflowPath = typeof candidate.path === "string"
    ? candidate.path.split("@", 1)[0]
    : "";
  if (workflowPath !== AGENCY_DURABLE_WORKER_WORKFLOW_PATH) return "workflow_path_mismatch";
  if (candidate.head_branch !== "main") return "head_branch_mismatch";
  if (typeof candidate.event !== "string" || !["schedule", "workflow_dispatch"].includes(candidate.event)) {
    return "event_not_allowed";
  }
  const actor = asRecord(candidate.actor);
  if (actor?.login !== "martinaburtoe-art") return "actor_mismatch";
  return null;
}

export function isTrustedAgencyWorkerRun(run: unknown, runId: string): boolean {
  return agencyWorkerRunDenialReason(run, runId) === null;
}
