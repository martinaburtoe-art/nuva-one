# P0 Golden Business — source-path audit and regression backlog

**Audit date:** 13 November 2026.
**Scope:** minimarket (`neighborhood_grocery`), hardware store (`hardware_store`) and wholesale distribution (`wholesale_distribution`).
**Method:** static inspection of current repository source, migration definitions and pgTAP files. No database was queried, no test suite was executed, and no production state was changed.
**Purpose:** trace the actual customer journey through UI → application service/RPC → database trigger/function → ledger/reporting → tests, and distinguish implementation from design/readiness declarations.

## 1. Executive findings

### What is present in source

- Three P0 profiles exist in the stable industry catalogue and have profile-specific onboarding questions.
- Industry profile persistence exists on `businesses` with primary/secondary profile and JSONB configuration fields.
- P0 configuration validation is implemented for the three profiles, with conservative defaults and explicit capability classification.
- POS checkout, fast sale, purchases, quotes/conversion, cash register and shipment workflows have application routes and database functions/migrations.
- Database-level stock oversell protections and lifecycle tests exist.
- Cash register, shipment and industry-profile persistence have dedicated pgTAP coverage.
- A generic Golden Business pgTAP simulation exists and checks stock, transactions, accounting journals, balanced journal lines and tenant separation.

### Material gaps requiring verification or remediation

1. **Inventory movement traceability:** migration history appears to replace the movement-writing sale/purchase trigger functions with lifecycle functions that update stock and transactions but do not insert movement rows. Later migration defines a movement-writing function again but does not visibly rebind the trigger. Existing lifecycle/Golden Business tests do not assert movement-ledger rows. Track in [Issue #344](https://github.com/martinaburtoe-art/nuva-one/issues/344).
2. **Fast-sale business context:** the sales UI reads data for the selected active business, but `create_fast_sale` selects the user's oldest active membership (`ORDER BY created_at LIMIT 1`) and accepts no explicit business ID. Multi-business users may hit a business-context mismatch. Track in [Issue #345](https://github.com/martinaburtoe-art/nuva-one/issues/345).
3. **P0 Golden Business coverage is generic, not vertical-complete:** current SQL simulation uses one generic tenant and one product. It does not exercise a minimarket receiving/selling loop, a ferretería quote-to-sale path, or a distributor partial shipment/credit path as separate end-to-end journeys.
4. **Industry configuration is not an operational feature switch:** the validator returns requested/available/planned capabilities and validates preferences. It does not itself activate a workflow, grant access or implement unit conversion, fractional stock, lots, price lists, credit or scheduled dispatch.
5. **The frontend POS and fast-sale paths are different write paths:** POS uses generic insert into `sales` (therefore depends on DB trigger lifecycle); the sales module's fast-sale action uses `create_fast_sale`. They need parity tests for stock, movements, accounting, retry and business context.

No production issue has been confirmed by live database inspection. Findings 1 and 2 are source-level risks with explicit reproduction requirements, not claims about current production runtime.

---

## 2. P0 profile and configuration trace

### Stable profile IDs

- `neighborhood_grocery` — minimarket / neighborhood grocery.
- `hardware_store` — ferretería.
- `wholesale_distribution` — distribuidora.

Source: `src/lib/industry-profiles.ts` (profile union and `INDUSTRY_PROFILES`).

### Profile persistence

- UI: `src/components/industry-profile-settings.tsx`.
- Read: selects `industry_profile`, `industry_secondary_profiles`, `industry_config` from `businesses` scoped by active business ID.
- Save: updates `industry`, primary profile, up to three secondary profiles, `industry_config`, version and updated timestamp.
- Schema: `supabase/migrations/20261112090000_business_industry_profile_persistence.sql`.
- DB regression: `supabase/tests/database/117_business_industry_profile_persistence.sql` (17 pgTAP assertions).

The settings component stores the onboarding answers as `{schemaVersion: 1, answers: ...}`; this should not be confused with the richer in-memory P0 validator shape that also describes channels, inventory, commercial and operations preferences.

### P0 validator

- `src/lib/industry-configuration.ts`
- `src/lib/industry-configuration.test.ts`

Verified from source:
- Detailed configuration is intentionally limited to the three P0 profiles.
- Unknown keys and invalid types/values are rejected.
- Defaults are opt-in / false.
- Expiry requires lot tracking.
- Package-to-unit and package-to-package transitions are classified as requiring explicit product-specific conversion.
- Requests for fractional quantity, multi-warehouse, price lists, volume pricing, credit, project quotes, scheduled dispatch and returns/warranty are classified against the readiness registry.
- The function comment explicitly states it validates preferences only; it does not persist, grant access or activate a feature.

**Interpretation:** profile selection and questionnaire completion are not evidence that an operational capability is live.

---

## 3. Actual P0 application paths

### A. Minimarket — POS checkout

**UI path:** `src/routes/_authenticated/pos.tsx`

Observed flow:
1. Loads `products`, `sales`, `customers` and payment integration records using business-scoped hooks.
2. Checkout performs a client-side stock check against cart quantities.
3. Cash/card-style checkout inserts a `sales` row using `useBizInsert("sales")` with status `paid`.
4. Online-payment checkout inserts a `sales` row with status `pending`, then requests a payment link.
5. Both paths rely on database sale-effect triggers for stock and financial side effects.

**Shared data helper:** `src/lib/biz-data.ts`
- `useBizList`, `useBizPage`, `useBizInsert`, `useBizUpdate`, `useBizDelete`.
- Reads/writes are scoped with the active business ID at the helper boundary.

**Database path:** `sales` trigger lifecycle and stock-effect functions; see section 4.

**Existing tests:**
- `src/lib/sales-inventory-regression.test.ts`: pure helper/model tests for stock bounds, status transitions, idempotent `stock_applied` model and rollback semantics.
- `supabase/tests/database/000_stock_oversell.sql`: 7 pgTAP assertions for oversell rejection and exact-stock boundary.
- `supabase/tests/database/063_sale_purchase_effect_lifecycle.sql`: 10 pgTAP assertions for sale/purchase stock and transaction lifecycle.

**Gap:** current Golden Business SQL does not execute the UI checkout/payment path and does not verify inventory movement history for each sale line.

### B. Ferretería — product sale and quote-to-sale

**Sales UI:** `src/routes/_authenticated/sales.tsx`
- Loads `sales`, `products`, `customers` in the active business context.
- The standard fast-sale action calls `supabase.rpc("create_fast_sale", ...)`.
- The RPC arguments include customer, channel, payment method, credit flag, due date, items and notes, but no selected business ID.

**Quote UI:** `src/routes/_authenticated/quotes.tsx`
- Reads/writes `quotes`, `products`, `sales`, `customers`.
- Quote conversion calls `convert_quote_to_sale(p_quote_id)`.
- The UI guards repeated taps locally; the database has a unique index on `sales.quote_id` to prevent duplicate conversion.

**Database path:**
- `supabase/migrations/20260920044000_secure_quote_conversion.sql`
- `supabase/migrations/20260920043500_unique_sale_quote_link.sql`

**Gap:** quote conversion has database-level uniqueness evidence, but current P0 Golden Business simulation does not test ferretería quote acceptance → sale → stock movement → accounting reconciliation as one journey. Package conversions, fractional quantities and product variants remain planned capabilities; do not imply that a quote's quantity field enables them.

### C. Distribuidora — purchase, customer credit and shipment

**Purchase UI route:** `src/routes/_authenticated/purchases.tsx` is a route wrapper; inspect the referenced purchase workspace for the active implementation before changing it.

**Shipment UI route:** `src/routes/_authenticated/shipments.tsx` is also a route wrapper; the actual workspace is under `src/components/shipments/`.

**Shipment database path:**
- `shipments` and `shipment_events` tables.
- `create_shipment_for_sale` RPC creates a shipment from a sale and records an initial `preparing` event.
- Shipment security regression: `supabase/tests/database/054_shipments_security.sql` (8 pgTAP assertions).

**Boundary:** existing `dispatch` means persisted shipment records/events. It does not prove route optimization, scheduled dispatch, vehicle capacity, driver assignment or proof-of-delivery certification.

**Gap:** current Golden Business simulation does not exercise partial wholesale fulfilment, backorder, customer credit approval/receivable ageing or shipment event reconciliation.

---

## 4. Sale/purchase inventory effects — migration-chain trace

### Historical movement ledger

`supabase/migrations/20260819060000_cash_inventory_control_v20.sql` defines:
- `products.reserved_stock`, `in_transit_stock`, `blocked_stock` and reorder fields.
- `inventory_movements` with `business_id`, `product_id`, signed `quantity_delta`, before/after stock, movement type, reason and source reference.
- `adjust_product_stock` RPC that updates stock and inserts an adjustment movement.

`supabase/migrations/20260819065000_inventory_movement_trace_v25.sql` defines `apply_sale_effects()` and `apply_purchase_effects()` that insert sale/purchase movement rows.

### Lifecycle trigger replacement

`supabase/migrations/20260920010000_fix_sale_purchase_effect_lifecycle.sql`:
- Drops `trg_apply_sale_effects` and `trg_unapply_sale_on_cancel`.
- Creates `trg_sync_sale_effects` invoking `sync_sale_effects()`.
- Replaces purchase trigger with `trg_sync_purchase_effects` invoking `sync_purchase_effects()`.

The inspected bodies of `sync_sale_effects()` and `sync_purchase_effects()` adjust `products.stock` and create/delete `transactions`; they do not insert rows into `inventory_movements`.

### Later stock hardening

`supabase/migrations/20260920024000_harden_fast_sale_available_stock.sql` defines:
- `create_fast_sale(...)`, which chooses an active business membership by `ORDER BY created_at LIMIT 1`.
- `validate_sale_inventory()`.
- A replacement `apply_sale_effects()` that writes movement rows and checks available stock.

The inspected migration text does not create or rebind a trigger to `validate_sale_inventory()` or this replacement `apply_sale_effects()`. The previously created lifecycle trigger still points to `sync_sale_effects()` unless a later migration changes it; no such later rebinding was found in the inspected migration set.

**Conclusion:** migration history strongly indicates a movement-ledger trace gap on the active sale/purchase lifecycle trigger path. Confirm actual database trigger definitions before remediation. This is tracked in Issue #344.

### Tests that currently miss this assertion

- `063_sale_purchase_effect_lifecycle.sql` checks stock and transaction changes but not `inventory_movements`.
- `113_golden_business_simulation.sql` checks purchase/sale stock, transactions, accounting journals and balanced journal lines, but not movement source references or movement totals.

---

## 5. Cash register and shipment evidence

### Cash register

UI: `src/routes/_authenticated/caja-control.tsx`
- Reads `cash_registers` and `cash_register_movements`.
- Uses `get_cash_register_summary`, `open_cash_register`, `record_cash_register_movement`, `close_cash_register`.

Database foundation:
- `20260816000000_cash_register_management.sql`
- `20260816010000_harden_cash_register_lifecycle.sql`
- `20260816020000_cash_register_session_summary.sql`

Tests:
- `050_cash_register.sql`
- `051_cash_register_lifecycle.sql`
- `052_cash_register_session_summary.sql`
- `053_cash_register_rls_summary.sql`

### Shipment

Database:
- `20260817210000_shipments_module.sql`
- `20260905030000_harden_shipments_rbac_and_event_integrity.sql`
- `20260905034000_harden_validate_shipment_event_business_execute.sql`
- `20260920050000_secure_sale_shipment_creation.sql`

Test:
- `054_shipments_security.sql`.

Do not repeat these foundations without a concrete failing scenario; extend only where P0 Golden Business tests reveal a real gap.

---

## 6. Golden Business coverage matrix

| Journey / invariant | Existing evidence | Current classification | Required next test |
|---|---|---|---|
| Basic stock decrement and oversell boundary | pgTAP 000 | Covered at DB level | Retain regression |
| Sale/purchase lifecycle and transaction effects | pgTAP 063 | Covered partially | Add movement ledger assertions |
| Generic purchase/sale accounting balance | pgTAP 113 | Covered for one synthetic business | Extend into three vertical fixtures |
| Cash register open/movement/close | pgTAP 050–053 | Dedicated coverage exists | Add to minimarket end-to-end fixture only if gap found |
| Shipment role/event integrity | pgTAP 054 | Security contract coverage exists | Add wholesale partial-delivery business journey |
| Industry profile persistence/constraints | pgTAP 117 | Schema/constraint coverage exists | Test onboarding settings round-trip if needed |
| P0 configuration validation | Vitest industry configuration suite | Unit-level coverage exists | Connect to settings only after service contract review |
| Product package conversion | No verified end-to-end conversion engine | Planned | Do not simulate as supported |
| Fractional stock quantity | `products.stock` remains integer per readiness evidence | Planned | Safe rejection until end-to-end decimal path exists |
| Multi-warehouse transfer | No verified transfer ledger | Planned | Do not advertise as available |
| Credit accounts / customer limits | No complete verified credit ledger | Planned | Require receivable/limit/approval evidence |
| Scheduled dispatch / route planning | Shipment records/events only | Planned | Do not claim routing or delivery slots |

---

## 7. High-priority regression backlog

### P0-A — restore/verify movement traceability (Issue #344)

In an isolated pgTAP test:
1. Insert a synthetic sale with one product line.
2. Assert stock delta, one transaction, and exactly one `inventory_movements` row with `source_type='sale'`, `source_id=sale.id`, signed quantity and correct before/after values.
3. Insert a received purchase and assert matching purchase movement.
4. Change sale to inactive/cancelled and verify a compensating movement, not silent history loss.
5. Change purchase to cancelled and verify a compensating movement or a formally documented reversal policy.
6. Edit/re-activate and verify no duplicate or missing ledger effects.
7. Reconcile sum of movement deltas to the stock delta for the fixture.

Do not implement the fix until the actual trigger wiring is verified against the target database and the expected reversal semantics are agreed.

### P0-B — bind fast sale to selected business (Issue #345)

In isolated pgTAP:
1. Create one user with active memberships in businesses A and B.
2. Select business B in application context.
3. Attempt fast sale with a product and customer belonging to B.
4. Prove the RPC writes only to B.
5. Attempt product/customer IDs from A while requesting B and prove rejection.
6. Attempt a user with no operational membership in B and prove denial.
7. Keep the RPC `SECURITY INVOKER` / authorization model intact; never trust client business ID without independent role verification.

### P0-C — three distinct Golden Business journeys

**Minimarket**
- Receive purchase → stock increase → sell through POS → cash close → transaction/accounting reconciliation.
- Retry same request and prove no duplicate effect.
- Stock insufficiency blocks commit.

**Ferretería**
- Create quote with explicit product/unit/price snapshot.
- Convert quote exactly once to sale.
- Reconcile stock, movement ledger, transaction and journal.
- Reject fractional/package conversion until supported by a product-specific conversion record.

**Distribuidora**
- Purchase receipt and customer-specific quote.
- Partial fulfilment with remaining backorder quantity.
- Shipment creation/event lifecycle.
- Customer credit only if an actual credit-account ledger and limit/approval path exist; otherwise mark unsupported.

Each fixture uses a separate synthetic tenant and unique IDs. Tests run inside rollback transactions; no production seed data.

---

## 8. Next implementation sequence

1. Resolve Issue #344 after runtime trigger inspection and add pgTAP movement assertions.
2. Resolve Issue #345 with selected-business parameter and membership validation plus multi-business regression.
3. Expand `113_golden_business_simulation.sql` or add a new isolated P0 test file for three vertical-specific journeys; do not mutate existing test fixtures.
4. Only after P0 paths reconcile, choose the first shared product-identity/unit-conversion/decimal implementation.
5. Keep profile configuration, capability readiness, authorization, plan entitlement and rollout as separate gates.

**Out of scope:** production migrations, backfills, deployments, RLS redesign, permission expansion, payment provider changes, inventory concurrency redesign or marking planned capabilities available.


---

## 9. Read-only production verification — 14 November 2026

The static findings above were checked against the connected Nüva One Supabase production database using read-only `SELECT` queries. No writes, migrations, backfills or test fixtures were run.

### Active database trigger wiring

The current production trigger catalog reports:

- `sales.trg_sync_sale_effects` → `public.sync_sale_effects()`.
- `sales.trg_validate_sale_inventory` → `public.validate_sale_inventory()`.
- `purchases.trg_sync_purchase_effects` → `public.sync_purchase_effects()`.

The production database also has `public.apply_sale_effects()` defined, and its body inserts into `inventory_movements`, but no active sales trigger in the inspected trigger list calls that function. The active `sync_sale_effects()` and `sync_purchase_effects()` bodies do not insert movement rows.

### Aggregate reconciliation of existing stock-applied records

Read-only aggregate join between stock-applied sale/purchase rows with product lines and `inventory_movements` by `business_id + source_type + source_id` returned:

| Source | Stock-applied records with product lines | With movement record | Missing movement record |
|---|---:|---:|---:|
| Sales | 37 | 20 | 17 |
| Purchases | 12 | 6 | 6 |

The missing set includes pre-ledger records, so the total missing counts must not be interpreted as all caused by the trigger replacement. The more decisive post-ledger signal is:

- After the latest movement timestamp (2026-09-20 03:11:07 UTC), there are **7 sale records** with product lines and stock applied but no corresponding movement row.
- In the same interval, there are **4 purchase records** with product lines and stock applied but no corresponding movement row.
- The latest stock-applied sale/purchase records in this aggregate are dated 2026-09-28 03:09:56 UTC.
- The latest inventory movement row is dated 2026-09-20 03:11:07 UTC.

This is now a **production-observed ledger gap**, not just a source-level hypothesis. It establishes missing movement trace records for those aggregate counts, but does not by itself establish whether any stock balance is incorrect. Do not fabricate historical movements or backfill until a reconciliation plan can prove each missing source line, stock_before/after and idempotent uniqueness.

### Production fast-sale RPC contract

Read-only inspection of `pg_proc` confirms production signature:

`create_fast_sale(uuid,text,text,text,boolean,date,jsonb,text)`

Arguments are customer, customer name, channel, payment method, credit flag, due date, items and notes. There is no selected business ID argument. Its body chooses an active membership by `ORDER BY created_at LIMIT 1`, matching the source-level finding in Issue #345.

### Operational safety and next action

- The production check was read-only.
- No business IDs, customer names, product names or transaction-level records were exported into this report.
- Do not run a repair or backfill in production.
- Next, reproduce both issues in an isolated Supabase development branch/test database, implement additive fixes and pgTAP assertions, then reconcile a dry-run report before any separately authorized production remediation.
