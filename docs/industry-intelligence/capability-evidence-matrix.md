# Industry capability evidence matrix

**Status:** initial evidence register based on the current industry readiness contract; engineering verification required before release certification.
**Rule:** capability status is not inferred from a profile's requested capabilities.

## 1. Current release-gate snapshot

The readiness registry currently identifies five capabilities as available and the rest as planned. This table records that boundary; it does not replace source-level verification.

| Capability | Current declared status | Evidence statement in registry | Vertical impact |
|---|---|---|---|
| Barcode | available | Product code registry and mobile scanner workflows exist | Minimarket, ferretería, distribuidora |
| Quotes | available | Persisted quotes workflow exists | Ferretería, distribuidora, workshop |
| Dispatch | available | Shipments module and persisted shipment events exist | Ferretería, distribuidora |
| Customer history | available | Customer records and CRM activity persist | All customer-facing profiles |
| Cash register | available | Cash register, movements and close controls exist | Minimarket, retail |

All other capabilities declared by the current registry remain planned, including product variants, fractional quantities, unit conversions, lots/expiry, serial tracking, multi-warehouse, price lists, volume pricing, dispatch scheduling, recipes/BOM, production orders, appointments, work orders, projects, fleet, asset rental, reservations, commissions, returns/warranty and customer credit.

## 2. Critical implementation implications

### Inventory quantity and unit model
- An integer product stock field means fractional quantity is not end-to-end ready, even if a movement table stores numeric quantities.
- A unit label is not a conversion engine. Conversion requires product-specific factor, dimension, effective date, rounding policy and provenance.
- Package terms such as box, sack, roll, bar, pallet and display are not globally convertible.
- A variant label does not create unique stock identity per size/color/specification.
- Lot/expiry requires traceability from receipt to issue, return, adjustment and recall; a date field alone is insufficient.

### Sales and commercial terms
- Quote availability does not imply price-list versioning, customer credit, quantity breaks, project margin or reservation.
- Confirmed quote lines must retain product/unit/price/discount/tax snapshots.
- A customer history timeline does not imply a complete CRM pipeline, consent management or automated campaign capability.

### Fulfilment
- Shipment events do not imply scheduled dispatch, route optimization, carrier integration, proof of delivery or capacity allocation.
- Dispatched does not mean delivered.
- Partial fulfilment must retain line-level balances and avoid releasing or consuming stock twice.

### Finance and analytics
- A cash register does not imply a complete accounting ledger, accounts payable/receivable, bank reconciliation, DSO or cashflow forecast.
- Gross margin requires complete COGS allocation and a declared tax basis.
- Profitability by customer, project, branch or route requires explicit direct/allocated cost methodology.
- Missing data must result in a coverage warning or unavailable KPI, not a zero or fabricated estimate.

## 3. Source traceability required before implementation

For each capability moving from planned to pilot/available, attach:

| Evidence class | Required proof |
|---|---|
| Data model | tenant-scoped schema, constraints, indexes, ownership and retention |
| Domain service | transactional operations, validation and invariant enforcement |
| API/RPC | authorization, input validation, idempotency and error semantics |
| UI | real user flow, permissions, empty/loading/error/pending states |
| Tests | unit, integration, RLS/tenant isolation, concurrency and end-to-end |
| Operations | audit trail, observability, retries/recovery and kill switch where applicable |
| Migration | backward compatibility, backfill, reconciliation and rollback |
| Product | supported scope, exclusions, KPI semantics and customer-facing documentation |

## 4. Prioritized capability build order

Priority is based on cross-vertical reuse and risk, not on the number of profile IDs requesting a feature.

1. **Product identity and catalog integrity:** variant model, tenant-safe SKU uniqueness, attribute schemas and barcode-to-variant resolution.
2. **Units and conversions:** dimensional model, product-specific ratios, rounding, purchasing/sales/returns/reporting consistency.
3. **Inventory traceability:** lot/expiry/serial where sector requires it; movement ledger, reservations and multi-location only as coherent end-to-end slices.
4. **Commercial engine:** price-list versions, customer terms, quantity breaks and discount approvals.
5. **Order fulfilment:** order state, reservation, picking, packing, partial shipment, delivery proof and returns.
6. **Finance foundation:** payable/receivable source documents, payment allocation, bank reconciliation, aging and cashflow.
7. **Vertical workflows:** recipe/BOM and production, work orders, appointments, projects, fleet/rental according to validated demand.

Do not build a broad generic settings surface before the domain invariants above are resolved.

## 5. Readiness promotion rule

- `planned → pilot`: implementation exists behind controlled access; core integration tests pass; limitations and rollback are documented.
- `pilot → available`: end-to-end, tenant isolation, concurrency, permission and recovery tests pass; production observability and support runbook exist; product/security sign-off is recorded.
- `available → deprecated`: migration path, customer impact, replacement and support window are documented.

A profile's requested capability list is a demand signal only. It is not evidence of implementation, entitlement or authorization.
