import { describe, expect, it } from "vitest";
import {
  AGENCY_DURABLE_WORKER_WORKFLOW_PATH,
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
  });
});
