# Nüva One — Scanner Operational Certification

## Purpose

This checklist defines the production acceptance criteria for using a mobile phone as the barcode scanner alongside the POS.

## Core flow

`camera/HID/native input -> normalize -> product resolver -> operation -> stock/cash/audit`

## Product onboarding

- [ ] Unknown scanned code opens the new-product flow with the scanned code prefilled.
- [ ] User can create a new SKU from the scanner flow.
- [ ] User can associate an unknown code with an existing product.
- [ ] Multiple codes can point to one product.
- [ ] Newly created code resolves immediately on the next scan.
- [ ] SKU uniqueness is enforced per business.

## POS

- [ ] Scan adds an existing product to the cart.
- [ ] Repeated scans increment quantity instead of creating duplicate lines.
- [ ] Sale is transactional and idempotent.
- [ ] Sale updates inventory through the canonical stock movement path.
- [ ] Sale is linked to the active business/cash session.

## Inventory

- [ ] Continuous scan remains on the camera after each successful read.
- [ ] Express count supports repeated scans without navigation away from the scanner.
- [ ] Failed line persistence prevents count finalization.
- [ ] Approved differences become audited stock movements.

## Operational modules

- [ ] Purchase receiving validates expected vs received quantities.
- [ ] Picking rejects an incorrect product.
- [ ] Dispatch records the completed operation.
- [ ] Returns record disposition (restock/damaged/quarantine/loss).
- [ ] Waste records reason and movement.
- [ ] Transfers enforce source availability and record origin/destination.

## Security

- [ ] Product and product-code RLS remains enabled.
- [ ] Scanner RPC privileges remain restricted.
- [ ] Tenant A cannot resolve or mutate tenant B data.
- [ ] Client-provided business identifiers are never trusted for authorization.

## Production acceptance

A feature is not certified by a successful build alone. It must have a passing automated test where practical, a successful deployment, and a verified production flow. The status must remain **NOT CERTIFIED** until every applicable checkbox above has evidence.

## Device Hub — multi-device / multi-module acceptance

- [ ] A stable registered device can be reused across modules without re-pairing.
- [ ] A device connection is separate from the one-time pairing token lifetime.
- [ ] Multiple devices can be connected to one business concurrently.
- [ ] Every device has its own authenticated user, business scope, label, last-seen time, and revocation state.
- [ ] Device registration never grants access by itself; all RPCs re-check Auth, business membership, module permission, and operation context.
- [ ] A scan is bound to exactly one active POS cart/register or one inventory/receiving task.
- [ ] Two POS carts never consume each other's scanner events.
- [ ] Revocation is enforced by the database on every subsequent write, including stale clients.
- [ ] Reconnection reloads canonical PostgreSQL state and replays pending outbox events with the same idempotency UUID.

## Collaborative inventory stocktake acceptance

- [ ] Count sessions are visible to all authorized participants in the same business.
- [ ] Every scan is persisted immediately; no client-only count array is authoritative.
- [ ] Unit mode increments one unit per unique scan event.
- [ ] Quantity mode records an explicit quantity event and never silently overwrites another participant's absolute count.
- [ ] The event ledger is append-only and has a unique constraint on stocktake + client event UUID.
- [ ] Each event records user, device, location/zone, code, mode, and server timestamp.
- [ ] Overlapping product/zone assignments are detected and require reconciliation where necessary.
- [ ] Finalization is atomic, repeat-safe, and produces auditable inventory movements exactly once.
- [ ] Stock changes (sales, receipts, transfers, adjustments) during a count are reconciled against a defined snapshot/cut-off; no movement is lost or double-applied.

## Unknown codes in every supported workflow

- [ ] Unknown code opens a create/associate flow in Caja, Inventory, and receiving.
- [ ] Creating from a count defaults opening stock to zero; physical quantity is recorded only in the count.
- [ ] Associating a code to an existing product does not create a duplicate product.
- [ ] The new code resolves immediately through the canonical tenant-safe resolver.
