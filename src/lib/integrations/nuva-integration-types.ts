export type IntegrationDirection = "in" | "out";
export type IntegrationHealth = "ok" | "configuration_required" | "error";

export type NormalizedIntegrationEvent = {
  provider: string;
  externalEventId: string;
  eventType: string;
  direction: IntegrationDirection;
  occurredAt?: string;
  resourceType?: string;
  resourceId?: string;
  payload: Record<string, unknown>;
};

export type IntegrationContext = {
  businessId: string;
  connectionId: string;
  provider: string;
  externalAccountId?: string | null;
  scopes?: string[];
  metadata?: Record<string, unknown>;
};

export interface NuvaIntegrationAdapter {
  provider: string;
  health(context: IntegrationContext): Promise<IntegrationHealth>;
  normalizeWebhook(input: {
    context: IntegrationContext;
    headers: Headers;
    rawBody: string;
  }): Promise<NormalizedIntegrationEvent>;
  verifyWebhook(input: {
    secret: string;
    headers: Headers;
    rawBody: string;
  }): Promise<boolean>;
  pull?(context: IntegrationContext, cursor?: string | null): Promise<{
    events: NormalizedIntegrationEvent[];
    nextCursor?: string | null;
  }>;
  push?(context: IntegrationContext, event: NormalizedIntegrationEvent): Promise<void>;
}
