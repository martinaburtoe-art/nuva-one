# Nüva Documents — Architecture & Delivery Specification

**Status:** implementation foundation / pending codebase integration audit  
**Date:** 2026-11-14  
**Target:** Nüva One (React + TypeScript + Vite + TanStack Router + Supabase/PostgreSQL + Inngest)  
**Reference product:** InvoiceFly; reproduce useful workflows, not proprietary UI/assets/code.

## 1. Product outcome

Build a native commercial-document capability that lets a business create, brand, send, track, approve and operationally convert quotations without re-entering data. It must work on mobile and desktop and integrate with CRM, catalog, inventory, sales, finance and Nüva Intelligence.

The first release is a reliable quotation lifecycle, not a generic document-builder marketplace.

## 2. Scope and release slices

### P0 — Quote lifecycle
- Document center: list, search, filter by status/client/date/owner, duplicate and archive.
- Guided editor: company profile, client, line items, quantities, unit, description, unit price, discount, tax treatment, notes, validity date, payment terms, optional attachments.
- Catalog and customer pickers reuse existing Nüva records; allow ad-hoc lines without silently creating catalog items.
- Live totals and responsive document preview.
- Branded PDF with business logo, legal identity, contact details, quote number, issue/expiry dates, itemized lines, net, discounts, tax breakdown, total and terms.
- Draft save, issue snapshot, PDF download and shareable customer view.
- Event timeline and safe duplicate operation.

### P1 — Approval and conversion
- Public, unguessable, revocable share token; customer view exposes only customer-safe fields.
- Explicit accept/reject action with signer name, timestamp, terms version and evidence metadata. Do not represent a typed name as qualified electronic signature.
- Idempotent conversion command that creates exactly one downstream sales/order record according to the existing Nüva sales workflow.
- Optional deposit request only after payment provider and reconciliation flow are verified.
- Inngest follow-up workflow with bounded retries, cancellation on terminal status, idempotency and tenant-aware event payloads.

### P2 — Industry intelligence
- Versioned industry profiles (construction, retail/distribution, technical services, agencies/consulting, hospitality/events).
- Optional structured sections such as milestones, labor/materials, travel, deliverables, warranty, shipping and volume tiers.
- AI-assisted drafting grounded exclusively in tenant catalog, costs, availability and explicit user input. AI output remains an editable draft; never auto-issue or invent price, tax, cost, stock or legal terms.

## 3. Domain model

Prefer existing canonical tenant, customer, product, inventory and sales tables. Before creating migrations, map their actual names, keys, RLS policies, triggers and existing quote implementation. Do not introduce parallel customer/product/sales sources.

Proposed logical entities (physical names must be reconciled with existing schema):
- commercial_documents: tenant_id, document_type, number, status, customer_id, currency, issue_date, valid_until, title, customer_snapshot, issuer_snapshot, totals_snapshot, terms_snapshot, template_version, created_by, issued_at, converted_to_id, version.
- commercial_document_items: document_id, position, item_type, catalog_item_id nullable, sku_snapshot, name_snapshot, description_snapshot, unit_snapshot, quantity, unit_price_minor, discount_type/value, tax_code_snapshot, tax_rate_basis_points, net/tax/gross minor amounts, cost_snapshot restricted to internal access.
- commercial_document_events: tenant_id, document_id, event_type, actor_id nullable, occurred_at, safe metadata, request/idempotency key.
- commercial_document_templates: tenant_id nullable for system templates, industry_key, schema_version, theme tokens and layout configuration.
- commercial_document_public_links: document_id, token_hash (never store raw token), expires_at, revoked_at, last_viewed_at.
- commercial_document_acceptances: document_id, decision, signer_name, signer_email nullable, accepted_document_version, accepted_terms_hash, occurred_at, evidence metadata, source metadata.
- document_sequences: tenant_id, document_type, period key and next value, allocated atomically.

Use existing storage conventions for generated PDFs and attachments. Never make private business documents publicly enumerable.

## 4. Financial and tax correctness

- Store CLP monetary values as integer pesos (or the repository's established exact-money representation); do not use floating-point arithmetic for persisted totals.
- Keep quantity precision explicit per unit. Use decimal-safe arithmetic for quantity × price.
- Define rounding policy once, test it, and apply it consistently to line tax and document totals.
- Snapshot item descriptions, unit prices, discounts, tax codes/rates, customer and issuer details at issue time. Later catalog edits must not mutate issued documents.
- Separate internal cost/margin data from customer-facing snapshots and PDF serialization.
- Show IVA breakdown only when the configured transaction treatment requires it. A quotation is a commercial offer, not an SII DTE or tax invoice.
- Do not create or claim SII-valid invoices. DTE issuance is a separate integration and compliance project.
- Make tax configuration tenant-specific and auditable; do not hard-code all business types to one tax treatment.

## 5. State machine and invariants

Suggested states: draft → issued → accepted | rejected | expired | cancelled; accepted → converted. A sent/issued document is immutable as a commercial snapshot; corrections create a new version or a replacement document with explicit relation.

Invariants:
1. Tenant isolation applies to every query, mutation, storage object and background event.
2. Only authorized tenant members can create/edit/issue; only permitted roles can see internal cost/margin.
3. Public link tokens are high entropy, hashed at rest, scoped to one document, expiring and revocable.
4. Public view never returns internal notes, cost, margin, inventory controls, private metadata or other tenant data.
5. State transitions use server-side authorization and compare-and-set/transactional guards.
6. Sequence allocation is concurrency-safe and tenant-scoped.
7. Acceptance binds to the exact issued version and terms hash.
8. Conversion is idempotent and cannot double-create a sale/order.
9. Issued PDFs are reproducible from immutable snapshots and versioned templates.
10. Event records are append-only to normal application roles; corrections are new events.

## 6. UX direction

- Follow Nüva One's existing design system and light premium visual language; do not introduce a visually separate app.
- Primary action: “Crear cotización”.
- Fast path: choose customer → add items → review totals → preview → save/send.
- Desktop: editor and preview side-by-side where existing layout primitives allow.
- Mobile: step-based editor with persistent total and clear save/preview actions.
- Template controls: logo, accent color, typography preset, header/footer, optional cover and section visibility.
- Customer-facing view must be fast, accessible, printable and usable without a customer account.
- Keep status, expiry and next action obvious. Avoid cluttering the dashboard with duplicate cards.

## 7. Integration contracts

- CRM: resolve customer from canonical records and write activity/timeline events using existing CRM mechanisms.
- Catalog: select products/services with current price and unit; preserve snapshot at issue.
- Inventory: quotation creation must not decrement stock. Any reservation is a distinct explicit workflow with expiry and release semantics. Stock movement occurs only through the existing order/sale fulfillment path.
- Sales: accepted quote conversion calls the existing canonical sales/order command; no direct ad-hoc inserts until that path is mapped.
- Finance: forecast/expected revenue is separate from recognized revenue and cash. A quote must not post accounting entries.
- Nüva Intelligence: read aggregate, permission-filtered quote metrics; do not expose individual private documents to unauthorized roles.
- Inngest: send events only after DB transaction commits (outbox or durable event pattern); jobs must be idempotent and tenant-scoped.

## 8. Observability and analytics

Track funnel metrics: drafts, issued, delivered, opened, accepted, rejected, expired, converted; time-to-first-response; win rate; average quote value; quote-to-sale conversion; loss reasons. Distinguish event delivery from actual customer view. Avoid collecting unnecessary personal data.

## 9. Test plan / release gates

### Unit
- money arithmetic, quantity precision, discount caps, tax rounding, date expiry, numbering.
- snapshot serialization and PDF formatting edge cases (long descriptions, multiple pages, accents, logo aspect ratios, empty optional fields).
- transition matrix and idempotency keys.

### Integration
- tenant A cannot read/write tenant B document, item, event, attachment or public link.
- role-based access to cost/margin.
- atomic number allocation under concurrency.
- public link revocation/expiry and response allowlist.
- acceptance against stale version rejected.
- repeated conversion requests create one downstream record.
- quote creation has no inventory or accounting side effects.
- Inngest retries do not duplicate reminders or state changes.

### E2E
- create from CRM customer and catalog items on desktop and mobile.
- create ad-hoc service quote.
- save draft, preview PDF, issue, open customer link, accept, convert once.
- reject, expire, cancel, duplicate and revise flows.
- verify no horizontal overflow and accessible keyboard/focus behavior.

### Release gates
- migration review and rollback plan; no production migration until schema audit and explicit release gate.
- RLS tests and pgTAP for every new tenant-scoped table.
- TypeScript, lint, full test suite, build and dependency/security checks.
- staging smoke test with synthetic demo tenant.
- verify production SHA and migration state after controlled deployment.
- Do not rerun previously certified unrelated audits unless a changed dependency invalidates their evidence.

## 10. Required codebase reconnaissance before implementation

The current repository's package manifest confirms React/TypeScript/Vite/TanStack/Supabase, jsPDF and Inngest dependencies. The GitHub connector could not resolve root README or guessed source paths, and code search did not return relevant source matches. Therefore the exact current routes, schema, existing quote module, PDF implementation, RLS conventions and sales conversion API remain unverified.

Before writing application code:
1. Obtain a current repository tree or local checkout and identify canonical routes/components/hooks.
2. Search existing schema/migrations for quote, estimate, proposal, invoice, sales order, customer, product and sequence tables.
3. Inspect RLS policies, storage policies, tenant resolver, role model and audit/event conventions.
4. Trace the existing sales conversion path and inventory side effects.
5. Reuse existing components and tables wherever possible; stop if an existing implementation already covers a capability.
6. Build P0 incrementally behind a feature flag; do not apply migrations or deploy automatically.

## 11. InvoiceFly reference analysis

Public InvoiceFly materials document a fast client/item-based estimate editor, branded templates, discounts and taxes, images/notes, acceptance/signature requests, shareable links/PDF, deposits, duplicate, follow-up and conversion to invoice. Nüva should adopt the low-friction workflow while differentiating through native ERP integration, Chilean tax boundaries, tenant-specific controls, immutable issue snapshots, margin intelligence and industry-specific estimating.

References:
- https://invoicefly.com/product/estimates-app/
- https://invoicefly.com/product/
- https://intercom.help/invoicefly/en/articles/9924791-creating-estimates-and-quotes
- https://intercom.help/invoicefly/en/articles/9924800-converting-estimates-quotes-to-invoices

---
**Delivery note:** This document is a technical implementation contract, not evidence that the feature is already implemented or deployed. Application code and database changes remain gated on source/schema reconnaissance.
