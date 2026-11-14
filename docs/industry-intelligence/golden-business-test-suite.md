# Golden Business test suite — sector template certification

**Status:** synthetic test design; no production fixtures or client records.
**Purpose:** provide deterministic acceptance tests for standardized business templates and prevent a sector label from overstating product readiness.

## 1. Test data policy

- Use synthetic identities, products, addresses, tax IDs and payment references only.
- Fix currency to CLP and timezone to `America/Santiago` for fixtures unless a test explicitly exercises timezone boundaries.
- Freeze clock, exchange rates, tax configuration and catalog versions per scenario.
- Keep source fixture, action sequence and expected ledger/document state in version control.
- Tests must run isolated by tenant and clean up their own data.
- Never seed synthetic records into production.
- Assert both positive outcomes and absence of forbidden side effects.

## 2. Golden Business portfolio

| Fixture | Profile | Business complexity | Main certification objective |
|---|---|---|---|
| Almacén Los Robles | `neighborhood_grocery` | High-SKU retail, fast checkout, mixed tenders, receiving, shift close | checkout, stock, payment and cash consistency |
| Ferretería El Martillo | `hardware_store` | Similar SKUs, dimensions, quotes, supplier units, partial dispatch | product identity, quote snapshot and unit safety |
| Distribuidora Central Maule | `wholesale_distribution` | B2B accounts, price versions, bulk orders, partial delivery | commercial snapshot and fulfilment integrity |
| Alma Café | `restaurant_cafe` | Menu, ingredients, table/takeaway, service periods | profile fit and explicit blocking of recipes/BOM until implemented |
| Boutique Trama | `apparel_footwear` | Style/size/color variants, seasonal stock, exchanges | prevent variant aggregation from implying variant-level stock |
| Taller Ruta 5 | `auto_repair_parts` | Vehicle history, quote, labor, parts, approval | no false work-order/appointment readiness |
| Estudio Norte | `professional_services` | Client, proposal, project milestones, time and deliverables | service workflow readiness without pretending inventory is central |

The last four are discovery/negative-readiness fixtures until their capability contracts are implemented and verified.

## 3. Shared platform assertions

Every fixture must verify:

1. **Tenant isolation:** tenant A cannot read, mutate, export or infer tenant B data through IDs, search, reports, AI context or background jobs.
2. **Permission isolation:** changing industry profile/configuration does not change the actor's grants.
3. **Idempotency:** replaying a command with the same operation key yields one business effect.
4. **Concurrency:** two actors cannot oversell, over-allocate or close the same cash shift twice.
5. **Auditability:** sensitive changes preserve actor, timestamp, reason and source.
6. **Snapshot integrity:** later catalog, price, tax or customer edits do not rewrite confirmed historical documents.
7. **Financial integrity:** totals reconcile from source documents and allocations; missing source data yields unavailable, not zero.
8. **Stock integrity:** movements reconcile to balances; retries and reversals do not double-apply.
9. **Failure recovery:** timeouts and transient errors leave recoverable states; retry is safe.
10. **Data export:** export respects tenant scope and actor permissions; sensitive fields are minimized.
11. **Localization:** CLP formatting, Spanish labels, Chile timezone and date boundaries are consistent.
12. **Responsive behavior:** critical workflows are operable on mobile without hidden actions or ambiguous tap targets.

## 4. Cross-cutting adversarial scenarios

| ID | Scenario | Expected result |
|---|---|---|
| GB-C01 | User switches profile from minimarket to ferretería | shared business records remain; only allowed presentation/configuration changes; no data reset |
| GB-C02 | Profile requests lot tracking while capability is planned | saved intent may be shown as pending; no fake lot screens, FEFO or expiry KPI |
| GB-C03 | Two cashiers sell the last unit concurrently | one valid sale succeeds; second receives conflict/availability response; no negative sellable stock |
| GB-C04 | Checkout request is replayed after client timeout | same sale result is returned or recoverable; no duplicate sale/payment/stock issue |
| GB-C05 | Price changes after quote acceptance | accepted quote remains unchanged; new quote uses new price |
| GB-C06 | Product has missing cost | sales may proceed per policy; margin KPI is unavailable/coverage-qualified |
| GB-C07 | A tenant submits another tenant's object ID | access denied without leaking existence or details |
| GB-C08 | Profile configuration includes unknown field | validation rejects it with field path; no partial persistence |
| GB-C09 | User requests fractional sale but stock path supports integers only | configuration reports planned; checkout does not accept unsupported fractional quantity |
| GB-C10 | Business has two activities and one operational profile | SII giro/activity and operational profile remain separate; no tax inference |
| GB-C11 | Branch timezone crosses midnight during report | records are bucketed by business-local date; UTC storage does not shift business day |
| GB-C12 | Background recommendation is stale | recommendation displays source timestamp/coverage and requests refresh or human review |
| GB-C13 | A posted receipt needs correction | reversal/adjustment preserves original and audit trail |
| GB-C14 | A dispatched order is refused | status becomes refused/exception; not delivered; quantities reconcile |
| GB-C15 | AI proposes stock or price change | recommendation is preview-only until an authorized actor approves; execution uses transactional domain service |

## 5. Required test layers

### Unit
- Manifest schema and version compatibility.
- Configuration validation, allowed values, unknown-key rejection.
- Unit dimension and product conversion validation.
- KPI formula and coverage calculations.
- Workflow transition guards and role policy decisions.

### Integration
- Persisted sale → stock issue → payment/document association.
- Purchase receipt → stock/cost movement.
- Quote acceptance → immutable line snapshot.
- Shipment events → delivery state.
- Cash shift open/movements/count/close.
- Tenant isolation across every linked relation and RPC.

### End-to-end
- One representative full business day for each P0 profile.
- One failure/retry path and one correction/return path per P0 profile.
- Mobile and desktop flows for critical actions.
- Resumen shows only KPIs supported by source data and capability readiness.

### Contract / regression
- Existing non-sector workflows remain unchanged when no profile is configured.
- Unknown or retired profile ID fails safely; no silent fallback to a different vertical.
- Schema version upgrade preserves prior user choices and never upgrades capability readiness by itself.
- Profile changes are reversible without rewriting historical transactions.

## 6. Evidence record format

For each test run, persist in CI artifacts (not client data):

- commit SHA and test suite version;
- fixture ID and deterministic seed;
- environment and schema/migration version;
- actor role and tenant boundary;
- command/request ID and idempotency key;
- expected vs actual document/ledger state;
- screenshots or trace for UX failures;
- pass/fail, reproducible error and owner.

## 7. Certification thresholds

A P0 template may be called **limited** only when the current product supports its explicitly listed subset and all tests for that subset pass. It may be called **certified** only when:

- all critical happy paths pass;
- no open P0/P1 integrity, authorization or tenant-isolation defects remain;
- all unavailable capabilities are clearly excluded;
- KPI calculations reconcile against deterministic fixtures;
- security and product reviewers sign the evidence record.

A green unit-test suite alone is not certification. A profile being present in a TypeScript catalog is not certification. A successful build is not certification.
