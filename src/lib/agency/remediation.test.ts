import { describe, expect, it } from "vitest";
import { agencyAgents } from "./registry";
import { listRemediationKinds, proposeRemediation } from "./remediation";
import type { Incident } from "./types";

const incident: Incident = {
  id: "incident-ci",
  fingerprint: "ci123",
  title: "CI failure",
  status: "OPEN",
  severity: "MEDIUM",
  findings: [],
  hypotheses: [],
  actions: [],
  evidence: [],
  createdAt: "2026-09-28T03:00:00.000Z",
  updatedAt: "2026-09-28T03:00:00.000Z",
};

describe("agency remediation planner", () => {
  it("only exposes bounded remediation kinds", () => {
    expect(listRemediationKinds()).toEqual([
      "retry_ci_failure",
      "refresh_preview",
      "rebuild_generated_artifact",
    ]);
  });

  it("creates a policy-checked low-risk action", () => {
    const action = proposeRemediation(
      incident,
      "retry_ci_failure",
      agencyAgents.find((agent) => agent.id === "devops")!,
    );

    expect(action?.risk).toBe("LOW");
    expect(action?.reversible).toBe(true);
    expect(action?.verificationPlan.length).toBeGreaterThan(0);
  });

  it("refuses critical incidents at the planner boundary", () => {
    const action = proposeRemediation(
      { ...incident, severity: "CRITICAL" },
      "retry_ci_failure",
      agencyAgents.find((agent) => agent.id === "devops")!,
    );

    expect(action).toBeNull();
  });

  it("refuses an action requested by the wrong agent", () => {
    const action = proposeRemediation(
      incident,
      "retry_ci_failure",
      agencyAgents.find((agent) => agent.id === "engineering")!,
    );

    expect(action).toBeNull();
  });
});
