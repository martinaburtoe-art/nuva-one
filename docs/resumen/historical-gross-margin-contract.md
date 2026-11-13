# Resumen — historical gross-margin data contract

**Status:** safety/accuracy contract. No schema change or new capability is active.

## Verified current behavior

- POS writes sale line JSON with `product_id`, `name`, `qty` and `price`.
- The current POS cart does not capture a sale-time cost snapshot.
- `products.cost` is mutable master data. It can change after a sale.
- The current sales triggers apply inventory, transactions, cash ledger and accounting effects; they do not enrich sale lines with a cost snapshot.
- Therefore current product cost cannot be used to claim historical gross margin.

## Rule applied in Nüva Score

A gross-margin component is included only if every line in every sale in the period has:
- stable product reference;
- positive finite quantity;
- finite non-negative selling price;
- finite non-negative `unit_cost_snapshot` captured at the time of sale.

If any line is missing the snapshot or has malformed values, the entire margin component is omitted. Never substitute today's `products.cost`, zero, an average or an inferred value.

This means historical sales created before a secure snapshot mechanism exists will not contribute a margin score. That is intentional: a missing metric is preferable to a false financial result.

## Why not put cost in public sale JSON?

The sales row is visible to operational users according to current sales permissions. Adding cost to `sales.items` could disclose confidential acquisition costs and margins to users who are allowed to register sales but not view finance data. Do not add cost fields to sale JSON without a formal permission and data-exposure review.

## Recommended future architecture

1. Add a stable `line_id` UUID to each sale line; do not identify a line only by array index.
2. Store acquisition-cost snapshots in a private, non-Data-API table keyed by business, sale and line. Keep cost values out of public sale JSON.
3. Capture snapshots atomically when a sale is committed, using the cost value valid at that instant and the same transaction as inventory/accounting posting.
4. Cover every sale creation path: POS, manual sales, quote conversion, imports, integrations, recurring/automated workflows and API writes. A POS-only implementation is not sufficient for company-wide margin.
5. Provide a read path that independently validates the authenticated user's membership and finance permission. Prefer a server-side function/Edge Function with explicit authorization; do not introduce a broad SECURITY DEFINER endpoint or expose the private schema.
6. Record source cost, currency, quantity/unit, captured timestamp and source version so that corrections and audit can be traced.
7. Test tenant isolation, role permissions, concurrent sale posting, rollback, cancellation, returns, partial refunds, product cost changes and legacy rows without snapshots.

## Release gates

- No margin KPI or score for lines without snapshots.
- No public exposure of acquisition costs through sales rows, receipts, invoices, exports, browser caches or logs.
- No changes to existing RLS as part of the current Resumen correction.
- No production migration until a no-cost isolated CI/local database validates the schema, permissions and rollback behavior.
