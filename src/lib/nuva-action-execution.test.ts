import { describe, expect, it } from "vitest";
import { planActionExecution } from "./nuva-action-execution";

const action = {
  id: "cash-burn",
  priority: "critical" as const,
  title: "Riesgo de caja",
  reason: "Caja proyectada negativa",
  action: "Revisar flujo",
  impact: 100,
  destination: "finance" as const,
  cta: "Revisar finanzas",
  mode: "review" as const,
};

describe("action execution policy", () => {
  it("blocks missing tenant context", () => {
    expect(planActionExecution({ action, businessId: "", actorUserId: "u1", approved: true, idempotencyKey: "abcdefghijkl" }).status).toBe("blocked");
  });

  it("blocks weak idempotency keys", () => {
    expect(planActionExecution({ action, businessId: "b1", actorUserId: "u1", approved: true, idempotencyKey: "short" }).status).toBe("blocked");
  });

  it("waits for explicit approval on critical actions", () => {
    const result = planActionExecution({ action, businessId: "b1", actorUserId: "u1", approved: false, idempotencyKey: "abcdefghijkl" });
    expect(result.status).toBe("ready");
    expect(result.requiresExplicitApproval).toBe(true);
    expect(result.auditRequired).toBe(true);
  });

  it("never executes a mutation; it only returns an approved plan", () => {
    const result = planActionExecution({ action, businessId: "b1", actorUserId: "u1", approved: true, idempotencyKey: "abcdefghijkl" });
    expect(result.status).toBe("approved");
    expect(result.auditRequired).toBe(true);
  });
});
