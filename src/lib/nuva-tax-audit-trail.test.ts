import { describe, expect, it } from "vitest";
import { appendTaxAuditEvent, createTaxAuditEvent } from "./nuva-tax-audit-trail";

describe("tax audit trail", () => {
  it("creates immutable events", () => {
    const event = createTaxAuditEvent({
      type: "exception_detected",
      period: "2026-08",
      actor: "system",
      occurredAt: "2026-08-20T20:00:00Z",
      entityId: "DTE-1",
      summary: "Documento duplicado",
      metadata: { severity: "high" },
    });
    expect(event.id).toContain("DTE-1");
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.metadata)).toBe(true);
  });

  it("does not append the same event twice", () => {
    const event = createTaxAuditEvent({
      id: "evt-1",
      type: "validation",
      period: "2026-08",
      actor: "system",
      occurredAt: "2026-08-20T20:00:00Z",
      entityId: "F29-1",
      summary: "Validación ejecutada",
      metadata: {},
    });
    const result = appendTaxAuditEvent(appendTaxAuditEvent([], event), event);
    expect(result).toHaveLength(1);
  });
});
