# P0 sector configuration contract

Status: application-level validation foundation for the three P0 profiles only. P1/P2 profiles are intentionally rejected by this detailed schema until their own contracts are implemented. This is not database persistence, onboarding UI, or a claim that planned workflows are live.

## Separation of concerns

1. Industry profile identifies what the tenant does.
2. Configuration records non-sensitive operating preferences selected by its owner.
3. Capability readiness is evidence-backed product availability.
4. Authorization and subscription entitlements remain independent and authoritative.

A preference cannot enable a feature, grant access, bypass a module guard, or change tenant boundaries.

## P0 profiles

### Ferretería and building materials
Capture sales channels, base/purchase/sale units, fractional-quantity preference, multiple-warehouse preference, price-list and volume-pricing preferences, project quotation and dispatch preferences.

A box of screws, cable roll or timber bundle needs a product-specific conversion factor. Unit labels are not conversion factors. This contract records intent only; real conversion requires a variant-aware ledger integration.

### Almacén and minimarket
Capture channels, package units, lot/expiry preferences, fractional quantities and multiple locations. Expiry tracking requires lot tracking. Buying a case and selling units requires a product-specific conversion and ledger integration.

### Distribuidora and mayorista
Capture wholesale/delivery channels, units, multiple warehouses, customer price lists, volume pricing, credit-account and scheduled-dispatch preferences. These preferences do not create customer pricing, receivables aging, picking or partial-dispatch workflows.

## Validation and release contract

- Reject unknown profile IDs, fields, channels and units.
- Reject wrong runtime types and incompatible measurement dimensions.
- Deduplicate channel and unit lists deterministically.
- Defaults are conservative and opt-in.
- Require lot tracking before expiry tracking.
- Never infer package conversion ratios.
- Keep shipment dispatch separate from scheduled dispatch: an existing shipment workflow does not prove calendar scheduling, capacity allocation or route-slot management.
- Return requested, available and planned capabilities separately.
- Only evidence-backed available capabilities may be exposed as enabled.
- Configuration is not an authorization boundary.

## Persistence target (not implemented)

The reviewed additive business-scoped proposal remains: industry_profile, industry_secondary_profiles, industry_config, industry_config_version and industry_profile_updated_at. No migration or production write is part of this change. Existing tenants remain untouched; no inferred profile/backfill.

## Required next gates

1. Unit tests for this contract.
2. Onboarding review UI with explicit planned-vs-available display.
3. Additive tenant-scoped persistence in a zero-cost local/CI environment.
4. Server-side validation, tenant isolation, audit and optimistic concurrency tests.
5. Implement actual inventory and sector workflows before activating their capability flags.
6. Add sector-specific Resumen indicators only when backed by real sources and coverage.
7. Authenticated desktop/mobile QA; preserve POS, scanner, stock concurrency, checkout and RLS.


## Automated validation
The sector catalog workflow runs the configuration contract test when this file and its test are present on the pull-request merge ref, followed by application typecheck and production build.
