import { describe, expect, it } from "vitest";
import {
  AGENCY_DURABLE_WORKER_WORKFLOW_PATH,
  agencyWorkerRunDenialReason,
  agencyWorkerRunDiagnosticDetails,
  isTrustedAgencyWorkerRun,
  type TrustedAgencyWorkerRun,
} from "./worker-auth";

const validRun: TrustedAgencyWorkerRun = {
  id: 123456,
  status: "in_progress",
  path: `${AGENCY_DURABLE_WORKER_WORKFLOW_PATH}@refs/heads/main`,
  event: "schedule",
  head_branch: "main",
  repository: { full_name: "martinaburtoe-art/nuva-one" },
  actor: { login: "martinaburtoe-art" },
};

describe("durable agency worker identity", () => {
  it("accepts only the active scheduled workflow on main from the repository owner", () => {
    expect(isTrustedAgencyWorkerRun(validRun, "123456")).toBe(true);
  });

  it("rejects runs from another workflow, branch, event, actor, or repository", () => {
    expect(isTrustedAgencyWorkerRun({ ...validRun, path: ".github/workflows/ci.yml@refs/heads/main" }, "123456")).toBe(false);
    expect(isTrustedAgencyWorkerRun({ ...validRun, head_branch: "feature/test" }, "123456")).toBe(false);
    expect(isTrustedAgencyWorkerRun({ ...validRun, event: "pull_request" }, "123456")).toBe(false);
    expect(isTrustedAgencyWorkerRun({ ...validRun, actor: { login: "contributor" } }, "123456")).toBe(false);
    expect(isTrustedAgencyWorkerRun({ ...validRun, repository: { full_name: "someone/else" } }, "123456")).toBe(false);
  });

  it("rejects completed, mismatched, and malformed run IDs", () => {
    expect(isTrustedAgencyWorkerRun({ ...validRun, status: "completed" }, "123456")).toBe(false);
    expect(isTrustedAgencyWorkerRun(validRun, "123457")).toBe(false);
    expect(isTrustedAgencyWorkerRun(validRun, "not-a-run-id")).toBe(false);
    expect(agencyWorkerRunDenialReason(validRun, "0")).toBe("invalid_run_id");
    expect(agencyWorkerRunDenialReason(validRun, "9007199254740992")).toBe("invalid_run_id");
  });

  it("reports a stable reason for each rejected worker identity without weakening the gate", () => {
    expect(agencyWorkerRunDenialReason(validRun, "123457")).toBe("run_id_mismatch");
    expect(agencyWorkerRunDenialReason({ ...validRun, repository: { full_name: "someone/else" } }, "123456")).toBe("repository_mismatch");
    expect(agencyWorkerRunDenialReason({ ...validRun, status: "completed" }, "123456")).toBe("run_not_in_progress");
    expect(agencyWorkerRunDenialReason({ ...validRun, path: ".github/workflows/ci.yml@refs/heads/main" }, "123456")).toBe("workflow_path_mismatch");
    expect(agencyWorkerRunDenialReason({ ...validRun, head_branch: "feature/test" }, "123456")).toBe("head_branch_mismatch");
    expect(agencyWorkerRunDenialReason({ ...validRun, event: "pull_request" }, "123456")).toBe("event_not_allowed");
    expect(agencyWorkerRunDenialReason({ ...validRun, actor: { login: "contributor" } }, "123456")).toBe("actor_mismatch");
  });

  it("distinguishes malformed run payloads and IDs", () => {
    expect(agencyWorkerRunDenialReason(null, "123456")).toBe("invalid_run_payload");
    expect(agencyWorkerRunDenialReason([], "123456")).toBe("invalid_run_payload");
    expect(agencyWorkerRunDenialReason(validRun, "not-a-run-id")).toBe("invalid_run_id");
  });

  it("extracts safe diagnostics from valid and malformed GitHub payloads", () => {
    expect(agencyWorkerRunDiagnosticDetails(validRun)).toEqual({
      runStatus: "in_progress",
      workflowPath: `${AGENCY_DURABLE_WORKER_WORKFLOW_PATH}@refs/heads/main`,
      event: "schedule",
      headBranch: "main",
      repository: "martinaburtoe-art/nuva-one",
      actor: "martinaburtoe-art",
      returnedRunId: 123456,
    });
    const empty = {
      runStatus: null,
      workflowPath: null,
      event: null,
      headBranch: null,
      repository: null,
      actor: null,
      returnedRunId: null,
    };
    expect(agencyWorkerRunDiagnosticDetails(null)).toEqual(empty);
    expect(agencyWorkerRunDiagnosticDetails("unexpected")).toEqual(empty);
    expect(agencyWorkerRunDiagnosticDetails([])).toEqual(empty);
    expect(agencyWorkerRunDiagnosticDetails({
      status: 42,
      path: {},
      event: null,
      head_branch: false,
      repository: null,
      actor: [],
      id: "123456",
    })).toEqual(empty);
  });

  it("rejects malformed GitHub field types without throwing", () => {
    expect(agencyWorkerRunDenialReason({ ...validRun, path: {} }, "123456")).toBe("workflow_path_mismatch");
    expect(agencyWorkerRunDenialReason({ ...validRun, repository: [] }, "123456")).toBe("repository_mismatch");
    expect(agencyWorkerRunDenialReason({ ...validRun, actor: [] }, "123456")).toBe("actor_mismatch");
    expect(agencyWorkerRunDenialReason({ ...validRun, event: 42 }, "123456")).toBe("event_not_allowed");
    expect(agencyWorkerRunDenialReason({ ...validRun, status: 42 }, "123456")).toBe("run_not_in_progress");
  });

  it("bounds and strips control characters from denial-log metadata", () => {
    const details = agencyWorkerRunDiagnosticDetails({
      id: 123456,
      status: `completed\n${"x".repeat(80)}`,
      path: "p".repeat(300),
      event: "schedule\u0000workflow",
      head_branch: "release\r\nbranch",
      repository: { full_name: `org/${"r".repeat(300)}` },
      actor: { login: `bot\t${"x".repeat(200)}` },
    });
    const hasControlCharacter = (value: string) => [...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 0x1f
        || (codePoint >= 0x7f && codePoint <= 0x9f)
        || codePoint === 0x2028
        || codePoint === 0x2029;
    });

    expect(details.runStatus).toBe(`completed ${"x".repeat(22)}`);
    expect(details.workflowPath).toHaveLength(256);
    expect(details.event).toBe("schedule workflow");
    expect(details.headBranch).toBe("release  branch");
    expect(details.repository).toHaveLength(256);
    expect(details.actor).toHaveLength(128);

    for (const value of Object.values(details)) {
      if (typeof value === "string") expect(hasControlCharacter(value)).toBe(false);
    }
  });
});
