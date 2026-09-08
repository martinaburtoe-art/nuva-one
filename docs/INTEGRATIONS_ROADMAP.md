# Nüva One — Integration Architecture Roadmap

## Objective

Convert **Conexiones** into a real integration layer without replacing Nüva One modules. External services must extend the operating system of the SME while Nüva One remains the source of business context, tenant authorization and permissions.

## Priority stack

### P0 — Automation and customer operations

1. **Cal.com** — scheduling and appointments.
   - Embed booking inside Nüva One.
   - Event types per business/user.
   - Availability and booking synchronization.
   - Webhooks into Nüva events.
   - Use cases: sales meetings, customer appointments, consultations, post-sale follow-up.

2. **n8n** — workflow orchestration.
   - Nüva event -> signed webhook -> n8n workflow.
   - n8n -> Nüva authenticated callback for actions.
   - Per-business workflow namespace.
   - Retry/idempotency and execution audit.
   - Never expose n8n credentials to the browser.

3. **Chatwoot** — omnichannel customer service.
   - Contact/conversation synchronization with CRM.
   - Embedded customer chat where appropriate.
   - Conversation events into Nüva Intelligence.
   - Customer/contact identity mapped to Nüva tenant + CRM record.
   - Webhooks for conversation/message/contact events.

### P1 — Analytics and product intelligence

4. **PostHog** — product analytics and UX intelligence.
   - Tenant-aware event taxonomy.
   - Feature flags for controlled releases.
   - Session replay only with explicit privacy/consent policy.
   - Error tracking and funnels for critical workflows.
   - Never send sensitive financial/tax/customer content as event properties.

### P2 — Collaboration and business workspace

5. **Nextcloud** — business files and document workspace.
   - Folder per business.
   - Links from quotes, purchases, invoices and accounting records.
   - WebDAV/OCS server-side integration.
   - Share/version metadata exposed in Nüva, files remain in Nextcloud.

6. **Penpot** — collaborative design workspace.
   - Useful for marketing/brand assets, catalog material and campaign design.
   - Prefer external workspace linking/integration before attempting to mirror Penpot data into Nüva.
   - Plugin/webhook integration can be evaluated for deeper workflows.

## Architectural rule

All integrations must pass through a common Nüva integration boundary:

`Nüva UI -> Nüva server route -> integration adapter -> external service`

Never:

`Nüva browser -> external secret/API token`

The adapter must receive the authenticated Nüva business/user context and enforce tenant membership before performing external operations.

## Integration contract

Each provider should implement the same conceptual contract:

- `provider`
- `enabled`
- `connection_status`
- `capabilities[]`
- `external_account_id`
- `connected_by`
- `connected_at`
- `last_sync_at`
- `last_error`
- `metadata`

Secrets belong only in server-side environment/secret storage. Database records contain references and non-sensitive connection metadata only.

## Event contract

Use a normalized Nüva event envelope:

```text
id
business_id
actor_user_id
provider
source
entity_type
entity_id
event_type
occurred_at
idempotency_key
payload
```

`payload` must be provider-specific but validated with Zod before entering application logic.

## Security requirements

- Tenant membership is checked before every read/write operation.
- OAuth state/PKCE is mandatory where supported.
- Webhook signatures are verified server-side.
- Idempotency keys prevent duplicate external actions.
- External IDs are namespaced by provider.
- Secrets are never returned to client components.
- Logs redact access tokens, cookies, authorization headers and sensitive payload fields.
- External webhook endpoints are rate-limited and replay-resistant where practical.

## UX requirements for Conexiones

Every integration card must show:

- What it does.
- Why a SME would use it.
- Current status: `Disponible`, `Conectado`, `Requiere configuración`, `Próximamente`, or `Error`.
- Required permissions/scopes.
- Data that enters Nüva.
- Data that leaves Nüva.
- Last synchronization/event.
- Disconnect/revoke action.
- Link to the relevant Nüva module.

## Recommended implementation order

1. Integration registry + connection status model.
2. Cal.com OAuth/API + booking webhooks.
3. n8n signed webhook gateway + event catalog.
4. Chatwoot CRM/contact/conversation bridge.
5. PostHog privacy-safe analytics foundation.
6. Nextcloud file/document bridge.
7. Penpot collaboration integration.
8. Cross-provider automation recipes combining the above.

## High-value Nüva recipes

- **Nuevo lead -> Cal.com:** create/offer a meeting automatically.
- **Lead booked -> CRM:** update pipeline stage and create follow-up task.
- **Venta cerrada -> Chatwoot:** open post-sale conversation/task.
- **Stock critical -> n8n:** notify responsible person and create purchase workflow.
- **Documento generado -> Nextcloud:** archive it in the business folder.
- **Campaign/design request -> Penpot:** create/link the design workspace.
- **Any critical workflow -> PostHog:** measure conversion, latency and failure rate without leaking business data.
- **Business event -> Nüva Intelligence:** enrich the executive view with external operational signals.

## Definition of done

An integration is not considered complete when its button or iframe works. It is complete only when:

1. Connection/authentication works.
2. Tenant isolation is verified.
3. Core read/write operations work.
4. Webhooks are verified and idempotent.
5. Errors and retries are observable.
6. Disconnect/revocation works.
7. Tests cover authorization and duplicate-event behavior.
8. Production deployment is verified.
9. The integration appears consistently in Conexiones and relevant modules.
10. Sensitive data handling is documented.
