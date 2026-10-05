
# Nüva One — Integration Architecture Roadmap

## Current scope

Active: Cal.com, Chatwoot and privacy-safe PostHog analytics.

Deferred: Nextcloud and Penpot, only when customer evidence justifies them.

Retired / out of current architecture:
- n8n
- WhatsApp
- Nüva Studio

Do not create new runtime routes, database outboxes, AI tools, UI surfaces or credentials for retired providers without a new explicit product decision.

## Architectural rule

All active integrations must pass through a Nüva server-side integration boundary. External secrets never reach browser code. Every operation enforces authenticated tenant membership, webhook verification, idempotency and observable errors.

## Integration contract

Active providers should expose: provider, enabled, connection_status, capabilities, external_account_id, connected_by, connected_at, last_sync_at, last_error and non-sensitive metadata.

## Event contract

Use a normalized Nüva event envelope with business_id, actor_user_id, provider, source, entity_type, entity_id, event_type, occurred_at, idempotency_key and validated payload.

## Implementation order

1. Integration registry + connection status model.
2. Cal.com connection and booking events.
3. Chatwoot CRM/contact/conversation bridge.
4. PostHog privacy-safe analytics.
5. Deferred integrations only after evidence of customer demand.

## Definition of done

An integration is complete only when authentication, tenant isolation, core operations, idempotent webhooks, error/retry observability, disconnect/revocation, authorization tests, production verification and sensitive-data documentation are all present.
