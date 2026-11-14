# Industry platform primitives — implementation dependency graph and activation backlog

**Cut-off:** 13 November 2026.
**Status:** engineering planning based on static source inspection; not an implementation certification.
**Inputs:** existing 23-profile catalogue, readiness registry, P0 configuration validator, data-model/rollout contract and operating contracts in waves 1–4.
**Scope:** sequence shared platform work so the 23 operating templates can become real without building 23 separate applications.

## 1. Executive decision

Nüva One already has a stable catalogue of 23 operational profile IDs and a conservative capability-readiness registry. The catalogue describes target business needs; it does not activate those workflows.

The inspected source registry contains **25 capabilities: 5 marked available and 20 planned**. The five available entries are:
- `barcode`
- `cash_register`
- `customer_history`
- `dispatch`
- `quotes`

This is the registry's declared evidence, not independent certification of every vertical path. The other 20 remain planned. The detailed configuration validator is intentionally limited to three P0 profiles—`hardware_store`, `neighborhood_grocery` and `wholesale_distribution`—and validates preferences only. It does not persist, authorize, create conversions or activate workflows.

**Recommended next engineering move:** do not start by building more sector-specific screens. First prove and strengthen the shared data and transaction primitives on the P0 business journeys, then expose them through bounded vertical templates.

## 2. Non-negotiable product contract

A capability is usable only after all applicable gates pass:

1. **Requested:** the business explicitly says it needs it.
2. **Configured:** valid parameters and business-specific rules are supplied.
3. **Implemented:** complete workflow exists in source and persisted domain model.
4. **Authorized:** tenant, role and plan entitlement permit the action.
5. **Enabled:** rollout has activated the verified capability for that tenant.
6. **Observed:** success, failure, retries and reconciliation are measurable.

No earlier state implies a later one. Profile selection cannot grant access, alter tax activity, change plan entitlements, or make a planned capability available.

Keep operational profile, SII giro, legal evidence, configuration, readiness, authorization, entitlement and rollout separate.

## 3. Readiness baseline — exact source interpretation

### Available in the current registry

| Capability | Registry evidence | Release interpretation |
|---|---|---|
| Barcode | Product code registry and mobile scanner workflows exist | Regress scanner/POS paths before changes; not proof of lot/serial tracking |
| Cash register | Cash register, movements and close controls exist | Verify reconciliation and permission coverage per tenant |
| Customer history | Persisted customer records and CRM activity exist | Verify timeline completeness, retention and tenant isolation |
| Dispatch | Shipments module and persisted shipment events exist | Does not imply schedule, route optimization, vehicle capacity or proof-of-delivery certification |
| Quotes | Quotes module and persisted workflow exist | Verify accepted snapshot, conversion, expiry and retry behaviour |

### Planned in the current registry

| Capability | Exact key | Dependency / primary blocker |
|---|---|---|
| Product variants | `product_variants` | Tenant-safe family/variant identity, unique SKU/barcode and compatibility with legacy products |
| Fractional units | `fractional_units` | Decimal-safe precision across UI, API, database, RPC, POS, ledger, receipt and reports; current product stock is integer |
| Unit conversions | `unit_conversions` | Product-specific, dimension-aware, effective-dated factors and immutable transaction snapshots |
| Lots and expiry | `lots_expiry` | Lot balances, expiry, allocation, waste, quarantine and recall graph |
| Serial tracking | `serial_tracking` | One-unit identity lifecycle across receipt, sale, return and repair |
| Multi-warehouse | `multi_warehouse` | Location-owned balances, transfer in/out, in-transit and reconciliation |
| Price lists | `price_lists` | Tenant/customer-scoped, versioned price resolution |
| Volume pricing | `volume_pricing` | Deterministic quantity breaks across quote and POS |
| Dispatch scheduling | `dispatch_scheduling` | Calendar, slots, typed capacity, conflict handling and route assignment |
| Recipes/BOM | `recipes_bom` | Versioned component structure, compatible units, costing and substitutions |
| Production orders | `production_orders` | Material reserve/issue, actual consumption, output, scrap, rework and close |
| Appointments | `appointments` | Atomic interval/resource calendar, provider availability, buffers and reminders |
| Work orders | `work_orders` | Lifecycle, labor, parts, approvals, field evidence and closeout |
| Projects | `projects` | Budget, cost codes, milestones, commitments, actuals and change control |
| Fleet | `fleet` | Vehicle, driver, trip, capacity, maintenance and evidence lifecycle |
| Asset rental | `asset_rental` | Serialized asset availability, time interval reservation, contract and return |
| Reservations | `reservations` | Domain-specific availability, hold expiry, confirmation, check-in and cancellation |
| Commissions | `commissions` | Versioned calculation, attribution, approval, settlement and reversals |
| Returns/warranty | `returns_warranty` | Original transaction, eligibility, serial/lot identity, disposition and financial reversal |
| Credit accounts | `credit_accounts` | Credit limit, receivable ageing, collections, approval and ledger reconciliation |

Do not edit the readiness registry to mark a capability available merely because a schema, screen or preference flag has been added.

## 4. Dependency graph — implementation lanes

The order below is a dependency-aware sequence, not a promise of delivery dates. Some lanes can be explored in parallel, but activation must respect dependencies.

### Lane A — product identity, units and quantity integrity

**Priority: P0 foundation.** Unlocks reliable stock and commercial operations across hardware, grocery, wholesale, fresh food, apparel, books/electronics, manufacturing, agriculture, construction, logistics and rental consumables.

Sequence:

1. **A1 — canonical product identity and variants**
   - Preserve existing product rows and legacy reads.
   - Add explicit family/variant identity only after all product write/read paths are mapped.
   - Tenant-scoped uniqueness for normalized SKU/barcode.
   - Do not overload product name or JSON display text as variant identity.
   - Golden tests: duplicate SKU race, barcode collision, variant edit, legacy product compatibility.

2. **A2 — dimensioned units and product-specific conversions**
   - Define dimensions (count, mass, length, area, volume, time, package).
   - Store conversion factor per product/variant/pack, with effective dates and provenance.
   - Require positive factor, compatible dimensions and documented precision.
   - Snapshot the conversion used by each transaction; later edits cannot reinterpret history.
   - Golden tests: case of 12, roll of 25 m, kg-to-g, invalid cross-dimension conversion, factor changed after sale.

3. **A3 — decimal-safe quantities**
   - Audit all numeric paths including TypeScript types, input parsing, database columns, RPCs, stock ledger, reservations, reports, exports and receipts.
   - Choose precision/rounding rules by dimension and business case; never use binary floating-point for financial or quantity arithmetic where exact decimal semantics are required.
   - Maintain compatibility with integer-only current stock until a fully tested migration and dual-read/write plan exists.
   - Golden tests: 0.125 kg, 1.375 kg, repeated conversion round trips, concurrent fractional sales and receipt/report parity.

4. **A4 — multi-location ownership and transfer**
   - Model location-scoped balances and transfer state (requested, picked, in-transit, received, discrepancy).
   - Existing stock concurrency primitives remain authoritative.
   - A location label alone is not a warehouse.
   - Golden tests: partial transfer, in-transit loss, duplicate receipt and concurrent sales at separate locations.

**Exit gate for Lane A:** existing POS/scanner/sales/purchase flows remain compatible; precision and conversions reconcile end-to-end; no overselling regression; migration rollback rehearsed; tenant isolation and concurrency tests pass.

### Lane B — traceability, returns and regulated evidence

**Priority: P0/P1 depending on vertical.** Needed for fresh food, butcher, bakery, minimarket perishables, agriculture, electronics, veterinary/pet retail and after-sales.

Sequence:

1. **B1 — lot lifecycle**
   - Supplier lot, receipt line, location balance, transformation lineage, sale allocation, return, quarantine, waste and recall.
   - Lot quantity is a ledger, not a text field.
   - FEFO only when expiry data and allocation engine are valid.
   - Missing supplier lot/expiry remains unknown; no synthetic dates.

2. **B2 — serial lifecycle**
   - One identity per serialized unit.
   - Receive → available → reserved → sold → returned/repair/quarantine/disposed.
   - Unique tenant-scoped serial identity and privacy-safe display.
   - Link original sale and warranty claim.

3. **B3 — returns and warranty**
   - Eligibility from original sale, policy snapshot and product identity.
   - Disposition: restock, quarantine, repair, supplier return, refund, exchange or reject.
   - Stock and finance reversal are separate but correlated, idempotent events.
   - Human approval for exceptional/ambiguous cases.

4. **B4 — evidence registry**
   - Source, scope, actor, timestamp, owner, review state, retention and provenance.
   - Regulatory/quality/clinical/safety claims require qualified review.
   - Uploading a document is not a compliance verdict.

**Exit gate for Lane B:** trace from source receipt to every descendant sale/return; quarantine blocks sale; serial cannot duplicate; reversal reconciles inventory and finance; access is purpose-bound and tenant-safe.

### Lane C — typed scheduling, reservations and dispatch

**Priority: P1.** Unlocks delivery slots, vehicle/driver assignment, appointments, room nights, classes, veterinary boarding, field service and equipment rental.

Do not create a generic reservation table that erases resource semantics. Define a shared scheduling kernel with typed adapters:

| Domain resource | Capacity semantics | Conflict rule |
|---|---|---|
| Rental asset | Exclusive asset over a time interval | No overlapping confirmed reservation; maintenance blocks availability |
| Room/accommodation | Room-night inventory by date | One confirmed allocation per room-night |
| Provider/technician | Person interval plus skill/availability | No overlapping assignment; skill and buffer checks |
| Class/tour | Seats within a scheduled departure/session | Capacity cannot exceed confirmed seats |
| Vehicle/trip | Vehicle and driver interval plus weight/volume/pallet constraints | No double assignment; capacity units cannot be mixed |
| Material | Quantity hold, not time-exclusive asset booking | Available quantity cannot be reserved twice |

Minimum kernel contract:
- tenant/resource identity and resource type;
- capacity unit and capacity value;
- timezone-aware interval and buffers;
- hold expiry and release;
- atomic confirmation and conflict response;
- cancellation/reschedule policy snapshot;
- actor, event and idempotency key;
- offline/retry conflict resolution;
- maintenance/blocked states;
- audit and reconciliation.

Sequence:
1. C1 — typed resource identity and calendar semantics.
2. C2 — atomic hold/confirm/cancel/reschedule transactions.
3. C3 — reminders/outbox with provider acceptance and idempotent retries.
4. C4 — capacity-aware dispatch/route integrations where a provider is actually connected.
5. C5 — proof-of-delivery, check-in and handover events.

**Exit gate for Lane C:** concurrency tests prove no overbooking; timezone/DST edge cases pass; retries do not double-book; cancellation restores availability once; notification state is truthful; external provider failures are observable.

### Lane D — production, projects and service execution

**Priority: P1/P2 after A and relevant scheduling/traceability dependencies.**

1. **D1 — work-order kernel**
   - Typed work order, scope, status, assignee, labor, parts, approvals, attachments and closeout.
   - Use separate domain adapters for manufacturing, repair, construction and field service.
   - Never assume all work orders consume inventory in the same way.

2. **D2 — BOM/formula and production**
   - Versioned BOM, unit conversion, substitutions, material issue, actual consumption, output, scrap, rework and yield.
   - Material reservations and lot genealogy are dependencies where relevant.
   - Historical work orders keep the exact BOM version.

3. **D3 — project controls**
   - Work breakdown, baseline, budget/cost codes, commitments, actuals, milestones, progress evidence and change orders.
   - Estimates, commitments and actual costs remain distinct.
   - A progress measurement is not automatically an invoice or statutory certificate.

4. **D4 — fleet and asset maintenance**
   - Asset registry, vehicle/driver, meter, maintenance, availability and release-to-service.
   - Evidence expiry does not equal legal certification; human review required.

5. **D5 — rental lifecycle**
   - Asset reservation, contract snapshot, dispatch/return inspection, meter usage, extension, deposit settlement and maintenance.
   - Depends on serial/asset identity and typed time-exclusive reservation.

**Exit gate for Lane D:** partial completion, cancellation, rework, actual cost and stock movement reconcile; no duplicate consumption/output; baseline/version immutability; maintenance blocks resource use.

### Lane E — commercial and financial extensions

**Priority: P1.** Must use existing pricing, quote, checkout, payment and accounting boundaries.

1. **E1 — price lists:** tenant/customer/segment scope, effective dates, priority and deterministic conflict resolution.
2. **E2 — volume pricing:** quantity breaks, eligible units, promotion stacking, margin guardrails and immutable sale snapshot.
3. **E3 — customer credit:** limits, terms, approval, receivable ledger, ageing, collection and write-off controls.
4. **E4 — commissions:** attribution, versioned rule, reversals, approval and settlement.
5. **E5 — commercial reconciliation:** quote → order → delivery/service → invoice/payment → credit/refund, with idempotent transitions.

**Exit gate for Lane E:** price resolution is deterministic and explainable; accepted quote snapshots are immutable; credit exposure reconciles to receivables; commission reversals work; financial changes receive independent review.

## 5. Recommended vertical activation order

The best order balances commercial relevance, reuse and operational risk. It is not simply the order in which profiles were documented.

| Activation cohort | Profiles | Shared prerequisites | Why this order |
|---|---|---|---|
| P0 proof | `neighborhood_grocery`, `hardware_store`, `wholesale_distribution` | Existing POS/cash/quotes/dispatch plus A1–A3 and core reconciliation | High-frequency core transactions; validates the most reusable primitives |
| P1 retail/service | `apparel_footwear`, `books_stationery_electronics`, `auto_repair_parts`, `professional_services` | A1/A2, B2/B3, D1, E1/E2 as applicable | Variants, serials, warranty and quote-to-service paths |
| P1 food | `beverage_store`, `produce_market`, `butcher_fishmonger`, `bakery_pastry`, `restaurant_cafe` | A2/A3, B1, D2, expiry/traceability and food evidence | High perishability, yield and unit-conversion risk |
| P2 production/field | `manufacturing_workshop`, `agriculture_agroinputs`, `transport_logistics`, `construction_contractor`, `equipment_rental`, `field_technical_service` | A lanes, B where needed, C and D, offline evidence | Scheduling, project costing, work orders and resource constraints |
| P2 appointments/experience | `beauty_wellness`, `veterinary_pet`, `lodging_tourism`, `education_fitness` | C, restricted data scopes, policy snapshots, outbox | Different booking/capacity semantics and sensitive information |
| Fallback | `general_business` | Safe shared core only | Must remain conservative and never imply all vertical capabilities |

The cohort order is a starting point. Validate demand, willingness to pay, support cost and representative customer workflows before committing implementation capacity.

## 6. P0 Golden Business execution pack

The following should become executable tests using isolated synthetic tenants before the first profile is called certified:

### GB-P0-RETAIL — minimarket
1. Receive supplier pack with explicit factor and captured cost.
2. Sell through scanner/POS, apply discount, split tender and commit sale once.
3. Verify stock movement and cash expected balance.
4. Retry same checkout event and prove no duplicate sale/payment/stock decrement.
5. Close shift and reconcile counted versus expected cash.
6. Reject sale under concurrent oversell attempt.
7. Show cost/margin as incomplete when cost source is missing.

### GB-P0-HARDWARE — ferretería
1. Create technical SKU and quote with unit/quantity/price snapshot.
2. Accept quote and convert to sale without losing original terms.
3. Attempt incompatible dimension conversion and confirm block.
4. Attempt fractional sale while fractional end-to-end capability remains planned and confirm safe rejection.
5. Verify quote expiry, amendment and duplicate conversion handling.

### GB-P0-WHOLESALE — distribuidora
1. Create customer quote with versioned price and credit terms.
2. Pick partial order and preserve backorder balance.
3. Create shipment using existing dispatch capability without implying route scheduling.
4. Record partial delivery and discrepancy.
5. Verify receivable/collection only where actual finance ledger supports it.
6. Confirm customer/warehouse scope isolation.

For every scenario capture: fixture IDs, exact service/RPC, expected state transitions, positive test, denial test, idempotency test, concurrency test, reconciliation query and evidence artifact.

## 7. Implementation contract for capability readiness

The readiness registry should remain a release gate, not a roadmap checkbox.

Recommended lifecycle:
- `planned`: requirements known; no complete operational path.
- `pilot`: complete path exists but is restricted to explicitly enrolled test/pilot tenants with support and rollback.
- `available`: verified, supported, documented and released under product policy.

Do not add a `pilot` status transition until the system has a real pilot allowlist, per-tenant activation, telemetry, support procedure and rollback control. A status enum without enforcement creates false confidence.

Promotion checklist:
- [ ] Code paths and domain objects identified.
- [ ] Schema migration additive and reversible; generated types refreshed.
- [ ] Tenant consistency and RLS/authorization tests pass.
- [ ] Positive, negative, concurrency and idempotency tests pass.
- [ ] Existing POS/scanner/checkout/stock/cash regression passes.
- [ ] Reports reconcile to source events and disclose incomplete coverage.
- [ ] Mobile/offline behaviour is truthful and recoverable.
- [ ] Audit, observability, alerting and support runbooks exist.
- [ ] Pilot tenant and feature flag are explicit.
- [ ] Product/security/engineering sign-off recorded.
- [ ] Production promotion requires separate explicit authorization.

## 8. Inngest and durable workflow orchestration

Inngest can be evaluated for long-running orchestration, reminders, retries and fan-out, but it must not become a second source of truth.

- PostgreSQL/Nüva transactional services remain authoritative for inventory, cash, bookings, contracts, payments and project balances.
- Inngest event IDs and idempotency keys must map to durable domain event IDs.
- Workflow steps call allowlisted application services/RPCs; never write business tables directly from an orchestration function.
- Use an outbox or equivalent transactional event publication so a committed business event cannot be lost between DB commit and workflow enqueue.
- Retries must be safe even when a downstream side effect succeeded but acknowledgement was lost.
- Failed jobs require DLQ/replay visibility, tenant-scoped diagnostics, operator controls and alerting.
- Approval steps must persist who approved what and which payload/version was approved.
- Kill switch and per-workflow concurrency/rate limits are mandatory for any workflow that can affect customer, stock or financial state.

Start with non-financial reversible workflows (e.g. internal reminders or stale-quote follow-up) only after event publication, idempotency and tenant scoping are proven. Do not start with automatic payments, inventory corrections, payroll, DTE issuance or irreversible customer actions.

## 9. Decisions and immediate next work

### Do now
1. Preserve all 23 stable IDs and current capability registry semantics.
2. Produce an implementation-path inventory for the P0 journeys using exact source paths, tables, RPCs and tests.
3. Execute the P0 Golden Business scenarios against existing services with synthetic fixtures.
4. Prioritize A1–A3 (identity, conversions, decimal-safe quantities) as the first shared vertical enabler, while protecting current integer stock and concurrency behaviour.
5. Define typed scheduling semantics before implementing appointments, reservations, fleet or rental.
6. Keep profile-specific UI thin: it should orchestrate shared capabilities and expose only the configuration required by that profile.

### Do not do
- Do not add vertical IDs, duplicate POS/stock/CRM/quotes/dispatch modules or bypass existing RPCs.
- Do not set all capabilities from a profile selection.
- Do not use a unit label as a conversion factor.
- Do not treat numeric movement quantity as proof of fractional stock support.
- Do not treat dispatch as route planning or scheduled delivery.
- Do not treat a calendar screen as atomic booking.
- Do not activate lots/expiry, serials, production, projects, fleet, rental, credit or commissions before complete end-to-end evidence.
- Do not run production migrations, backfills or deployments from this planning change.

**Final decision:** the next code implementation should be chosen from the P0 path audit and A1–A3 dependency lane, not from the next vertical UI request. This minimizes duplicate architecture, reduces customer data risk and unlocks the broadest set of business templates.
