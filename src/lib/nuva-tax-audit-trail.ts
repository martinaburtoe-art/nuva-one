export type TaxAuditEventType = "document_detected" | "exception_detected" | "reconciliation" | "correction" | "validation" | "period_locked";

export type TaxAuditEvent = {
  id: string;
  type: TaxAuditEventType;
  period: string;
  actor: string;
  occurredAt: string;
  entityId: string;
  summary: string;
  metadata: Record<string, string | number | boolean | null>;
};

export function createTaxAuditEvent(input: Omit<TaxAuditEvent, "id"> & { id?: string }): TaxAuditEvent {
  const id = input.id ?? `${input.period}:${input.entityId}:${input.type}:${input.occurredAt}`;
  return Object.freeze({ ...input, id, metadata: Object.freeze({ ...input.metadata }) });
}

export function appendTaxAuditEvent(events: readonly TaxAuditEvent[], event: TaxAuditEvent): TaxAuditEvent[] {
  if (events.some((item) => item.id === event.id)) return [...events];
  return [...events, event];
}
