import { describe, expect, it } from "vitest";
import { evaluateAction } from "./policy";
import type { Action } from "./types";

const baseAction: Action = {
  id: "act-test",
  incidentId: "inc-test",
  agentId: "devops",
  description: "retry a failed disposable CI job",
  risk: "LOW",
  autonomyLevel: "L2_CONTROLLED_AUTOHEAL",
  reversible: true,
  requiresApproval: false,
  verificationPlan: ["job completes successfully"],
  status: "PROPOSED",
};

describe("Nüva Agency policy", () => {
  it("allows bounded reversible low-risk auto-heal with verification", () => {
    expect(evaluateAction(baseAction).allowed).toBe(true);
  });

  it("blocks high-risk actions", () => {
    expect(evaluateAction({ ...baseAction, risk: "HIGH" }).allowed).toBe(false);
  });

  it("blocks actions without verification", () => {
    expect(evaluateAction({ ...baseAction, verificationPlan: [] }).allowed).toBe(false);
  });

  it("blocks non-reversible controlled auto-heal", () => {
    expect(evaluateAction({ ...baseAction, reversible: false }).allowed).toBe(false);
  });
});
