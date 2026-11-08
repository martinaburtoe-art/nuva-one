import { describe, expect, it } from "vitest";
import {
  AGENCY_WORKER_AUDIENCE,
  AGENCY_WORKER_OWNER,
  AGENCY_WORKER_REPO,
  AGENCY_WORKER_WORKFLOW_REF,
  isGeneralAgencyClaimEnabled,
  isTrustedAgencyWorkerClaims,
} from "../../supabase/functions/nuva-agency-worker-control/worker-claims";

describe("Agency global queue claim gate", () => {
  it("is disabled when the environment variable is absent", () => {
    expect(isGeneralAgencyClaimEnabled(undefined)).toBe(false);
  });

  it("accepts only the exact string true", () => {
    expect(isGeneralAgencyClaimEnabled("true")).toBe(true);
    expect(isGeneralAgencyClaimEnabled("false")).toBe(false);
    expect(isGeneralAgencyClaimEnabled("TRUE")).toBe(false);
    expect(isGeneralAgencyClaimEnabled("1")).toBe(false);
    expect(isGeneralAgencyClaimEnabled("")).toBe(false);
  });
});


describe("Agency worker OIDC trust boundary", () => {
  const runId = "123456";
  const agentId = "finance";
  const validClaims = {
    aud: AGENCY_WORKER_AUDIENCE,
    repository: AGENCY_WORKER_REPO,
    repository_owner: AGENCY_WORKER_OWNER,
    run_id: runId,
    ref: "refs/heads/main",
    workflow_ref: AGENCY_WORKER_WORKFLOW_REF,
    job_workflow_ref: AGENCY_WORKER_WORKFLOW_REF,
    actor: AGENCY_WORKER_OWNER,
    event_name: "schedule",
  };

  it("accepts the exact trusted repository, workflow, run and specialist", () => {
    expect(isTrustedAgencyWorkerClaims(validClaims, runId, agentId)).toBe(true);
  });

  it("rejects a different repository or owner", () => {
    expect(isTrustedAgencyWorkerClaims({ ...validClaims, repository: "attacker/repo" }, runId, agentId)).toBe(false);
    expect(isTrustedAgencyWorkerClaims({ ...validClaims, repository_owner: "attacker" }, runId, agentId)).toBe(false);
  });

  it("rejects a different workflow or branch", () => {
    expect(isTrustedAgencyWorkerClaims({ ...validClaims, workflow_ref: "attacker.yml@refs/heads/main" }, runId, agentId)).toBe(false);
    expect(isTrustedAgencyWorkerClaims({ ...validClaims, ref: "refs/heads/feature" }, runId, agentId)).toBe(false);
  });

  it("rejects a mismatched run ID, non-numeric run ID or zero", () => {
    expect(isTrustedAgencyWorkerClaims(validClaims, "654321", agentId)).toBe(false);
    expect(isTrustedAgencyWorkerClaims({ ...validClaims, run_id: "not-numeric" }, "not-numeric", agentId)).toBe(false);
    expect(isTrustedAgencyWorkerClaims({ ...validClaims, run_id: "0" }, "0", agentId)).toBe(false);
  });

  it("rejects untrusted actors and event types", () => {
    expect(isTrustedAgencyWorkerClaims({ ...validClaims, actor: "other-user" }, runId, agentId)).toBe(false);
    expect(isTrustedAgencyWorkerClaims({ ...validClaims, event_name: "pull_request_target" }, runId, agentId)).toBe(false);
  });

  it("rejects specialists outside the allowlist", () => {
    expect(isTrustedAgencyWorkerClaims(validClaims, runId, "attacker")).toBe(false);
  });

  it("allows legacy tokens without job_workflow_ref only when workflow_ref is exact", () => {
    const { job_workflow_ref: _ignored, ...legacyClaims } = validClaims;
    expect(isTrustedAgencyWorkerClaims(legacyClaims, runId, agentId)).toBe(true);
  });
});
