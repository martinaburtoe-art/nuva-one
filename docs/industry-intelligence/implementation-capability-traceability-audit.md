# Industry capability implementation traceability audit

**Audit status:** static source inspection of the industry-intelligence PR branch; not a production certification.
**Reviewed ref:** `feat/industry-intelligence-config-p0-v2-20261112`.
**Related work:** PR #321 (sector foundation), #338 (P0 certification specifications), #339 (23-profile specialization map).
**Scope:** distinguish catalogue declarations, configuration preferences, readiness gates and proven end-to-end product workflows.

## Executive finding

Nüva One has a useful sector registry and a conservative readiness gate. The registry describes what each vertical eventually needs; it does not implement those capabilities. In the inspected branch, exactly five capabilities are marked `available`: `barcode`, `cash_register`, `customer_history`, `dispatch`, and `quotes`. The other 20 registered capabilities remain `planned`.

The detailed configuration validator is P0-only for `hardware_store`, `neighborhood_grocery` and `wholesale_distribution`. It validates preferences; its own source comment explicitly says it does not persist, grant access or activate a feature. The persistence migration, onboarding/editor and Resumen integration are staged in PR #321, not production.

**No vertical is certified by this audit.** The next gate is an end-to-end path audit across POS, products, purchasing, stock ledger/RPCs, sales, shipments, cash, reports, authorization and tenant isolation.

## Evidence-backed source map

| Concern | Source inspected | What the source proves | What it does not prove |
|---|---|---|---|
| Stable vertical catalogue | `src/lib/industry-profiles.ts` | 23 stable IDs, operating descriptions, suggested units, questions, KPI labels and target capabilities | That a target capability exists at runtime |
| Capability release gate | `src/lib/industry-capability-readiness.ts` | Explicit lifecycle and evidence for every registered capability | That a capability marked planned is safe to enable |
| P0 preference validator | `src/lib/industry-configuration.ts` | Strict input keys/types, known channels/units, profile scope, conservative defaults and requested/available/planned separation | Persistence, authorization, inventory mutation or actual unit conversion |
| Validator tests | `src/lib/industry-configuration.test.ts` | Unknown-field rejection, opt-in defaults, incompatible dimensions, lot/expiry dependency and planned capability behavior | Full POS-to-ledger, concurrency or cross-tenant behavior |
| Readiness tests | `src/lib/industry-capability-readiness.test.ts` | All profile capabilities have a readiness entry; exactly five are currently available | Independent runtime verification of every workflow |
| Profile tests | `src/lib/industry-profiles.test.ts` | Unique IDs, fallback, search aliases and priority classification | Market validation of every archetype boundary |
| Sector dashboard manifest | `src/lib/industry-dashboard.ts` | Metric definitions are evidence-gated and may be planned/insufficient | Correctness of source aggregation or accounting reconciliation |
| Explicit answer serialization | `src/lib/industry-profile-answers.ts` | Only answered yes/no values are serialized | Server-side persistence or permission enforcement |
| P0 contract | `docs/industry-intelligence/p0-configuration-contract.md` | PR-branch rollout and release constraints | Production activation |
| Data-model contract | `docs/industry-intelligence/data-model-and-rollout.md` | Existing schema observations and safe conceptual migration sequence | Implementation of proposed variant, unit, lot, serial or BOM tables |

## Capability register

| Capability | Readiness in source | Evidence / blocking gap |
|---|---|---|
| Barcode | available | Product code registry and scanner workflows are cited by readiness; still include scanner/POS integration in release regression |
| Cash register | available | Cash register, movements and close controls are cited; verify opening/closing reconciliation and permissions per tenant |
| Customer history | available | Persisted customer records/activity are cited; verify timeline completeness and tenant isolation |
| Dispatch | available | Shipment module and persisted shipment events are cited; does not imply scheduling, route planning or proof-of-delivery completeness |
| Quotes | available | Persisted quotes workflow is cited; verify conversion to sale/order and immutable accepted-document snapshots |
| Product variants | planned | No first-class tenant-safe family/variant model verified |
| Fractional units | planned | Product stock is integer; numeric movement quantity alone is insufficient |
| Unit conversions | planned | No product-specific conversion-factor registry; allowed unit labels and dimension checks are not conversions |
| Lots and expiry | planned | No verified lot balance, expiry, FEFO, waste and recall lifecycle |
| Serial tracking | planned | No serialized identity lifecycle across receiving, sale, return and repair |
| Multi-warehouse | planned | No verified location-owned balances, transfers and reconciliation |
| Price lists | planned | No verified customer-scoped, versioned pricing engine |
| Volume pricing | planned | No complete quantity-break calculation across quotes and POS |
| Dispatch scheduling | planned | No schedule, capacity, slot and route allocation |
| Recipes/BOM | planned | No recipe/BOM costing and ingredient consumption |
| Production orders | planned | No reserve-consume-output-scrap lifecycle |
| Appointments | planned | No calendar/resource capacity lifecycle |
| Work orders | planned | No full work order with labor, parts, authorization and closeout |
| Projects | planned | No project budget, milestones, time and cost allocation |
| Fleet | planned | No vehicle/driver/trip/maintenance lifecycle |
| Asset rental | planned | No asset availability, rental contract and return inspection |
| Reservations | planned | No availability, booking, check-in and cancellation lifecycle |
| Commissions | planned | No calculation, approval and settlement workflow |
| Returns/warranty | planned | No complete returns, warranty and serialized/lot traceability workflow |
| Credit accounts | planned | No customer credit limit, receivables ageing and collection lifecycle |

## Configuration validator: precise interpretation

The current P0 validator is a preference contract, not an operational engine:

- It accepts only the three P0 profile IDs for detailed configuration; other profiles return `profile_not_in_p0`.
- It validates a finite channel list and profile-specific unit labels.
- It groups units into broad dimensions (count, package, mass, length, area, volume) and rejects incompatible dimensions.
- It does not store a conversion factor such as 1 case = 12 units or 1 roll = 25 metres. Those ratios must be defined per product/variant and must not be inferred from the unit label.
- It captures booleans such as fractional quantities, multiple warehouses, customer credit and scheduled dispatch as requested preferences. The capability registry still controls whether those capabilities are available.
- Expiry tracking requires lot tracking.
- Its tests explicitly expect unavailable capabilities to remain planned.

### Important design safeguard

Do not use a boolean preference as proof that an operational feature exists. Keep these concepts separate:

1. **Requested:** owner says the business needs the capability.
2. **Configured:** the business has supplied valid parameters.
3. **Implemented:** the full product workflow exists.
4. **Authorized:** role, plan and tenant guards permit use.
5. **Enabled:** controlled rollout has activated the verified capability for that tenant.

A capability is usable only when all applicable gates pass. A profile selection must never bypass them.

## P0 certification gates

### Minimarket / almacén — `neighborhood_grocery`

Must prove:
- Receive supplier purchase into the correct stock balance, with supplier cost and document trace.
- Sell through POS/scanner with stock decrement and cash/tender reconciliation.
- Support purchase pack versus sale unit only with an explicit product conversion factor.
- Prevent negative/oversold stock under concurrent checkout.
- For perishable goods, lot/expiry/FEFO/waste remain unavailable until their complete ledger and recall path is implemented.
- Shift close reconciles opening float + cash sales + cash in/out + expected cash versus counted cash.
- Sales, cost and margin reports state data coverage and exclude unknown cost from realized margin.

### Ferretería / materiales — `hardware_store`

Must prove:
- Technical SKU identity and attributes do not collapse into display-name text.
- Quote acceptance preserves a snapshot of description, unit, quantity, price, discount and customer.
- Cutting, fractional sale, length/area/volume units and product-specific conversions are blocked until end-to-end precision is implemented.
- Contractor/customer pricing and credit are not implied by the profile.
- Dispatch shipment is not represented as a scheduled delivery slot or route plan.
- Concurrent sale, reservation and adjustment preserve ledger invariants.

### Distribuidora / mayorista — `wholesale_distribution`

Must prove:
- Customer-specific price and discount resolution is deterministic and versioned before activation.
- Partial picking/delivery and backorders preserve order balances.
- Credit, receivables and collections reconcile to the customer ledger before exposure.
- Warehouse ownership and inter-warehouse transfers are not simulated by a location label.
- Proof of delivery, returns and damaged goods have auditable states.
- Cost-to-serve and margin include freight, discounts and payment costs only when source data is complete.

## Cross-cutting path audit required before code activation

The next engineering pass must enumerate the actual implementation paths and record exact file/table/RPC/test references for:

1. Product create/edit/import, SKU/barcode uniqueness and stock ownership.
2. Purchase order, supplier receipt, cost update and supplier return.
3. POS cart, discount, tax/document integration, payment and sale commit.
4. Stock movement, reservations, blocked/in-transit quantities, stocktake and correction.
5. Quotes, acceptance, conversion to order/sale and document snapshots.
6. Shipment creation, partial fulfillment, cancellation, delivery evidence and return.
7. Cash opening, cash movement, tender split, close and discrepancy approval.
8. Expenses, product cost, gross margin and period reconciliation.
9. Tenant/business scoping, role checks, RLS, idempotency, retries and concurrency.
10. Import/export, audit events, backups and recovery.

For each path, the evidence record must include:
- exact source paths and database objects;
- positive and negative tests;
- tenant isolation test;
- permission denial test;
- retry/idempotency test where mutations occur;
- concurrency test where stock/cash/financial balances change;
- data completeness and reconciliation rule;
- capability lifecycle decision with reviewer and date.

If a path cannot be traced from source, record **UNKNOWN** rather than inferring implementation from a UI label or documentation.

## Recommended implementation sequence

1. Finish read-only path inventory and mark every path PASS / PARTIAL / UNKNOWN / FAIL.
2. Add deterministic synthetic tests for minimarket, ferretería and distribuidora on existing services/RPCs; do not create parallel inventory or sales modules.
3. Fix shared-core gaps before vertical-specific UI: decimal quantity precision, product-specific unit conversion, variant identity, lot/serial ledger, price-list resolution and receivables.
4. Only after a shared capability is end-to-end, promote its readiness status with tests and reviewer evidence.
5. Certify one vertical at a time; P1 templates remain design-only until their own schema and workflows are implemented.

## Explicit non-goals

- No production migration, deploy, data backfill or tenant activation.
- No change to RLS, role guards, payment or stock concurrency primitives in this documentation pass.
- No new industry IDs or profile renaming.
- No duplicate POS, inventory, CRM, quotes or dispatch modules.
- No assertion that all 23 profiles or the seven priority profiles are certified.
