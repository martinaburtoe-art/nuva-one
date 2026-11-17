# Nüva One Device Hub — Architecture and implementation plan

**Status:** Architecture approved; first implementation slice committed; database migration not applied; functional certification pending.  
**Branch:** `feat/device-hub-multimodule-20261117`  
**Decisions:** count mode = unit + entered quantity; unknown codes = create/associate directly from scanner; device policy = shared across modules.

## 1. Product contract

Nüva One must support multiple authenticated devices in the same business at the same time. A registered phone can move between Caja, Inventario, receiving, picking, dispatch, and other authorized workflows without pairing again. Each device has its own user identity, permissions, activity, and active work context. Device sharing does not mean sharing credentials or bypassing module permissions.

All devices read and write the same tenant-scoped PostgreSQL records. PostgreSQL is the source of truth; Realtime is the notification/presence layer, not a write guarantee.

## 2. Verified baseline

The production database already contains:
- `mobile_scanner_sessions` and `mobile_scanner_events`; event idempotency is unique on `(session_id, client_event_id)`.
- `product_codes` for alternate codes, with business/product foreign keys.
- `inventory_stocktakes`, `inventory_stocktake_lines`, and `inventory_movements`.
- `lookup_product_by_code` and `create_product_from_scanner` RPCs.
- `finalize_inventory_stocktake`, which locks the stocktake and product rows and creates stock movements during finalization.

Verified frontend gaps on main at commit `6f72167172279b2d5759395a766ebc3340d852b9`:
- `src/routes/_authenticated/mobile-scanner.tsx` is guarded by `ModuleGuard module="pos"`; it is not a universal inventory/device entry point.
- Pairing state is stored in `sessionStorage`, so it is not durable across browser sessions.
- The mobile scanner screen describes the pairing as lasting 10 minutes; the paired session retains the same `expires_at` used for the short pairing window.
- `src/components/inventory-count-panel.tsx` accumulates count lines in React state, deletes/reinserts all lines only on finish, and does not persist each scan. A second device therefore cannot reliably see or contribute to the live count.
- The count panel's typed search checks `products.barcode` and `products.sku`; it does not use the canonical `lookup_product_by_code` resolver for that path.
- The count panel only adds `FOUND` scan resolutions; unknown-code creation/association is not wired into this count flow.
- `create_product_from_scanner` already supports tenant-checked product creation, code association, and explicit initial stock. New product creation during a stocktake must default initial stock to zero; physical quantity belongs to the count event, not an invented stock opening balance.

## 3. Target architecture

### 3.1 Device registry vs connection lease

Keep the concepts separate:
- **Registered device**: stable business-scoped identity for a browser/app installation, with display name, created_by/user, last_seen_at, revoked_at, and metadata. It is not an authentication credential.
- **Connection/session lease**: short-lived authenticated connection for the registered device. Pairing token expiry applies only before pairing. Paired leases are renewable and revocable, with a server-side idle/absolute lifetime.
- **Active context**: `module`, `operation_id`, optional `location_id` / zone, and timestamp. A device can switch contexts without re-pairing.

A device record must never grant access by itself. Every request still requires a valid Supabase Auth user and a current business membership/permission check. Revocation must be enforced server-side by every write RPC, not only by deleting local storage.

### 3.2 Universal scan envelope

Every scan submitted by a device carries:
- `client_event_id` (UUID generated once and reused on retry);
- `device_id`, `session_id`, `business_id` (business derived/validated server-side);
- `code_raw`, `code_normalized`, `symbology`;
- `module`, `operation_id`, optional `location_id`;
- `captured_at`, `received_at`, and authenticated `user_id`.

The server validates the lease, membership, module permission, operation ownership/status, and code normalization. A scan is routed only to its explicit operation context. It must never be broadcast to every open cart or every active count in a business.

### 3.3 Synchronization responsibilities

- PostgreSQL RPC/transactions: authoritative writes, uniqueness, row locking, idempotency, inventory movements, product creation.
- Supabase Realtime Presence: ephemeral connected/active status and participant roster; do not use it as a durable activity log.
- Supabase Realtime Broadcast or filtered Postgres Changes: notify clients that persisted state changed. On reconnect, clients reload canonical rows from PostgreSQL.
- Client outbox: persist unacknowledged scan envelopes in IndexedDB; retry with the same `client_event_id`. Do not apply stock changes optimistically as confirmed.
- UI state: show pending / saved / conflict / failed distinctly.

For moderate traffic, filtered Postgres Changes can be the first integration step. For broader fan-out, use private Broadcast channels with explicit Realtime Authorization. Never use public channels for business inventory.

## 4. Inventory count collaboration

Replace the current local-only React array and delete/reinsert finish flow with server-persisted count events.

Recommended model:
- `inventory_stocktake_scan_events`: append-only ledger; unique `(stocktake_id, client_event_id)`; actor, device, product, code, quantity delta or quantity-set event, zone/location, and timestamps.
- `inventory_stocktake_lines`: materialized aggregate by stocktake + product + count bucket/location, updated atomically by an RPC.
- `inventory_stocktakes`: shared state, participants, status, and version.

Two input modes:
1. **Unit mode**: each accepted physical scan contributes +1. Retrying the same event UUID does not increment again.
2. **Quantity mode**: scan once, enter a positive/non-negative quantity, then submit one idempotent quantity event. The UI must label whether the value is a bucket total or an adjustment; never silently overwrite another worker's count.

Concurrency rules:
- Serialize aggregate updates with row locks inside the RPC.
- Keep event ledger immutable; never delete/reinsert all lines on finalization.
- Track user/device and location/zone so teams can divide the store and detect overlapping product counts.
- If two workers submit absolute totals for the same product and same zone, surface a conflict for explicit reconciliation; do not last-write-wins.
- Count finalization is one transaction, locks the stocktake and affected product rows in deterministic order, creates one audited movement per product adjustment, and is idempotent.
- Define and test the stock snapshot/movement cut-off: sales, receipts, transfers, and adjustments during a long count must not be lost or double-applied. Do not finalize using stale system quantities without accounting for movements since the count baseline.

## 5. Unknown product workflow

When a code is not found:
1. Open a create/associate sheet with the code and symbology prefilled.
2. Offer **Create product** or **Associate code to existing product**.
3. Validate business membership and product-write permission server-side.
4. Use the existing canonical onboarding RPC or a hardened extension; do not insert products directly from the client.
5. Default initial stock to zero when created from a count.
6. Attach the new product to the active count and record the physical quantity through the count event RPC.
7. Re-resolve the code after commit; the next scan must return the same product.
8. Enforce business-scoped unique active codes and handle race conditions with a database constraint.

## 6. Implementation sequence

### P0 — shared device foundation
- Add stable registered-device identity and metadata.
- Split one-time pairing token expiry from paired session lifetime.
- Add device rename, last-seen heartbeat, revoke-all / revoke-one, and session renewal.
- Replace POS-only route gating with authenticated shared scanner entry; enforce module permissions at operation RPCs.
- Persist device identity/session metadata safely; never store a privileged bearer token in custom storage.

### P0 — scan router and Caja integration
- Add an explicit operation context for each POS cart/register.
- Subscribe the active POS to its own context only.
- Route scanner events through a server-validated handler and canonical product resolver.
- Preserve existing sale transaction, cash-session, and stock movement paths.

### P0 — collaborative stocktake
- Persist every count event immediately through an idempotent RPC.
- Subscribe all participants to the same stocktake; reconcile from database after reconnect.
- Add both count modes, zone assignment, participant attribution, duplicate/overlap warnings, and conflict resolution.
- Keep finalization atomic and auditable.

### P1 — all inventory workflows
- Reuse the same device identity and scan envelope for receiving, stock entries/exits, picking, dispatch, returns, and transfers.
- Bind scans to one explicit task/document at a time.

### P1 — product onboarding
- Wire create/associate code from Caja and Inventory scan surfaces.
- Ensure no stock is invented; initial stock is explicit and auditable.

### P2 — resilience and certification
- IndexedDB outbox, retry/backoff, reconnect reconciliation.
- Real-device camera tests on Android/iOS browsers and Capacitor.
- Concurrent multi-device, tenant-isolation, duplicate-event, offline, revocation, and stock-movement-during-count tests.
- Production acceptance only after deployed build + database migrations + end-to-end evidence.

## 7. Acceptance matrix

- 2+ phones and a desktop are connected to one business concurrently.
- A phone switches from Caja to Inventory without re-pairing.
- Two separate POS contexts never receive each other's scan events.
- Two or more workers contribute to one live stocktake; all see persisted updates.
- Unit scans increment exactly once per client event ID.
- Quantity submissions are idempotent and conflicts are explicit.
- An unknown code can create a product with zero initial stock or associate to an existing product.
- The new code resolves immediately in Caja, Inventory, and receiving.
- Reconnect replays pending events with original IDs and reconciles from PostgreSQL.
- Revoked/expired devices cannot submit, even if they retain stale local data.
- Tenant A cannot read, resolve, subscribe to, or mutate Tenant B data.
- Sales and receipts during stocktake are reconciled without lost or double-applied stock.
- Finalization produces auditable movements exactly once.

## 8. Safety boundary

This branch is an implementation plan, not a production change. No production schema, data, RLS policy, or deployed frontend is changed by this document. Do not mark Device Hub as complete until the acceptance matrix has evidence.


## 9. Implementation slice committed on the feature branch

The following first implementation slice is present in this branch:
- A migration draft adds durable paired-device leases (10-minute pairing token, 30-day renewable paired lease), cryptographically generated pairing codes with per-user attempt throttling, device label and module/operation context.
- A mobile scanner event now carries the assigned module and operation ID.
- An atomic start-or-join RPC serializes stocktake creation per business; a stocktake scan-event ledger and `record_inventory_stocktake_scan` RPC persist each count event idempotently, aggregating into the existing stocktake line.
- Secure code association RPC is included alongside the existing product-creation RPC.
- The Inventory count panel now loads the latest open count, persists every accepted scan, subscribes to shared count events, supports unit and batch-quantity modes, and exposes unknown-code create/associate flows.
- Mobile inventory events are replayed from the persisted scanner-event table after reconnect or reopening the count panel; events already present in the stocktake ledger are treated as acknowledged. Quantity-mode mobile scans are held in a FIFO confirmation queue so later scans cannot overwrite the current item.
- Private SECURITY DEFINER RPC implementations created by this migration explicitly revoke PUBLIC/anon execution and grant the minimum authenticated execution required by the invoker wrappers.
- Caja now creates a per-tab register context and exposes an operation-bound mobile pairing code. Mobile scan events are routed only to that register's operation ID; separate POS tabs do not share the same register context.
- A live Device Hub roster is surfaced in Caja and Inventario, showing lease state, active module, heartbeat freshness, last activity, and authorized revoke controls. Session lifecycle changes are published through Realtime.
- The mobile scanner route is no longer POS-only, persists its paired session in local storage, supports module/context changes, and renews its lease by heartbeat.

**Not certified yet:** this branch must rerun CI/build verification after the latest FIFO, replay, and function-privilege changes; the SQL migration has not been applied to Supabase; no live Android/iOS multi-device test has been performed. This first slice stores a paired session/lease, not yet a separate durable device registry with a stable device ID across re-pairing. Inventory operation routing depends on pairing/context being created for the active stocktake. A phone-side offline outbox, zone assignment/overlap reconciliation, and a full stable device registry remain subsequent work.

**Stock movement semantics:** each product line captures `system_qty` at the first accepted count event. Finalization applies `counted_qty - system_qty` as an adjustment to the product stock that exists at finalization time. This delta-on-current-stock pattern preserves intervening sales/receipts/transfers that have already changed `products.stock`; it is not equivalent to replacing current stock with the counted quantity. This is safe only if every inventory movement path updates `products.stock` transactionally and the physical count is interpreted at the first scan for that product. That invariant still requires end-to-end tests across POS, receiving, transfers, returns, and manual adjustments before production certification.
