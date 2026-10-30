import { describe, expect, it } from "vitest";
import {
  AGENCY_WORKER_AUDIENCE,
  AGENCY_WORKER_OWNER,
  AGENCY_WORKER_REPO,
  AGENCY_WORKER_WORKFLOW_REF,
  isTrustedAgencyWorkerClaims,
} from "../../../supabase/functions/nuva-agency-worker-control/worker-claims";

const validClaims = () => ({
  aud: AGENCY_WORKER_AUDIENCE,
  repository: AGENCY_WORKER_REPO,
  repository_owner: AGENCY_WORKER_OWNER,
  run_id: "41030396490",
  ref: "refs/heads/main",
  workflow_ref: AGENCY_WORKER_WORKFLOW_REF,
  job_workflow_ref: AGENCY_WORKER_WORKFLOW_REF,
  actor: AGENCY_WORKER_OWNER,
  event_name: "schedule",
});

describe("legacy Agency worker OIDC claims", () => {
  it("accepts the exact scheduled owner workflow on main", () => {
    expect(isTrustedAgencyWorkerClaims(validClaims(), "41030396490", "people")).toBe(true);
  });

  it("accepts an owner-dispatched run from the dedicated workflow", () => {
    expect(isTrustedAgencyWorkerClaims({ ...validClaims(), event_name: "workflow_dispatch" }, "41030396490", "qa")).toBe(true);
  });

  it("accepts the main-branch push event declared by the workflow", () => {
    expect(isTrustedAgencyWorkerClaims({ ...validClaims(), event_name: "push" }, "41030396490", "release")).toBe(true);
  });

  it("rejects a different OIDC audience", () => {
    expect(isTrustedAgencyWorkerClaims({ ...validClaims(), aud: "other-audience" }, "41030396490", "people")).toBe(false);
  });

  it("rejects another repository", () => {
    expect(isTrustedAgencyWorkerClaims({ ...validClaims(), repository: "attacker/repo" }, "41030396490", "people")).toBe(false);
  });

  it("rejects another repository owner", () => {
    expect(isTrustedAgencyWorkerClaims({ ...validClaims(), repository_owner: "attacker" }, "41030396490", "people")).toBe(false);
  });

  it("rejects a different run id", () => {
    expect(isTrustedAgencyWorkerClaims(validClaims(), "41030396491", "people")).toBe(false);
  });

  it("rejects non-main refs", () => {
    expect(isTrustedAgencyWorkerClaims({ ...validClaims(), ref: "refs/heads/feature" }, "41030396490", "people")).toBe(false);
  });

  it("rejects a different workflow file", () => {
    expect(isTrustedAgencyWorkerClaims({ ...validClaims(), workflow_ref: "martinaburtoe-art/nuva-one/.github/workflows/other.yml@refs/heads/main" }, "41030396490", "people")).toBe(false);
  });

  it("rejects a mismatched reusable job workflow", () => {
    expect(isTrustedAgencyWorkerClaims({ ...validClaims(), job_workflow_ref: "attacker/repo/.github/workflows/other.yml@refs/heads/main" }, "41030396490", "people")).toBe(false);
  });

  it("rejects a non-owner actor", () => {
    expect(isTrustedAgencyWorkerClaims({ ...validClaims(), actor: "some-contributor" }, "41030396490", "people")).toBe(false);
  });

  it("rejects unapproved workflow events", () => {
    expect(isTrustedAgencyWorkerClaims({ ...validClaims(), event_name: "pull_request_target" }, "41030396490", "people")).toBe(false);
  });

  it("rejects unknown specialist ids", () => {
    expect(isTrustedAgencyWorkerClaims(validClaims(), "41030396490", "root")).toBe(false);
  });

  it("rejects malformed run ids", () => {
    expect(isTrustedAgencyWorkerClaims(validClaims(), "0", "people")).toBe(false);
  });
});
