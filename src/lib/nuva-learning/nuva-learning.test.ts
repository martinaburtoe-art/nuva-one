import { describe, expect, it } from "vitest";
import { calculateNuvaTrust } from "./nuva-trust-engine";
import { reviewNuvaAction } from "./nuva-guardian";
import { verifyNuvaAction } from "./nuva-verification";
import { updateNuvaInstinct, instinctIsActionable } from "./nuva-instincts";

describe("Nüva learning foundation", () => {
  it("raises trust only from measured evidence inputs", () => {
    const result = calculateNuvaTrust({
      confidence: 0.95,
      evidenceQuality: "high",
      dataFreshness: 0.95,
      agentAgreement: 0.9,
      historicalAccuracy: 0.85,
      previousOutcomeQuality: 0.9,
    });
    expect(result.level).toBe("high");
    expect(result.canExecuteAction).toBe(true);
  });

  it("blocks duplicated or unauthorized actions", () => {
    const trust = calculateNuvaTrust({
      confidence: 0.9,
      evidenceQuality: "high",
      dataFreshness: 0.9,
      agentAgreement: 0.9,
      historicalAccuracy: 0.8,
      previousOutcomeQuality: 0.8,
    });
    const result = reviewNuvaAction({
      actionId: "collections",
      requiresApproval: false,
      reversible: true,
      permissionGranted: true,
      duplicateDetected: true,
      evidenceComplete: true,
      trust,
    });
    expect(result.decision).toBe("BLOCK");
  });

  it("keeps incomplete execution out of the learning loop", () => {
    const result = verifyNuvaAction(true, true, true, false);
    expect(result.passed).toBe(false);
    expect(result.stage).toBe("result");
  });

  it("makes an instinct actionable only after repeated evidence", () => {
    let instinct = updateNuvaInstinct(null, true);
    for (let index = 0; index < 5; index += 1) {
      instinct = updateNuvaInstinct(instinct, true);
    }
    expect(instinctIsActionable(instinct)).toBe(true);
  });
});
