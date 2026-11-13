# Industry Intelligence — data model and rollout contract

This document is a design proposal, not an applied migration. Production schema is unchanged.

## 1. Current verified constraints

Read-only inspection of Supabase project `vnzyecnbdqbfuxawzrda` on 2026-11-12 found:

- `businesses.industry` is the PostgreSQL enum `business_industry`, with values `retail`, `food`, `services`, `manufacturing`, `health`, `construction`, `other`.
- `businesses` has a `giro` text column. Keep it for tax/business-activity description; do not overload it with the SaaS vertical profile.
- `products` currently has one row per product with `sku`, `barcode`, `cost`, `price`, integer `stock`, thresholds, and reserved/in-transit/blocked stock. There is no first-class variant, unit-conversion, lot, or serial model in this table.
- Existing stock concurrency, SKU registry, movement trace and tenant-integrity work must remain authoritative. Do not replace or bypass existing inventory RPCs/triggers.

## 2. Business configuration

Proposed additive columns:

```sql
industry_profile text null,
industry_secondary_profiles text[] not null default '{}',
industry_config jsonb not null default '{}'::jsonb,
industry_config_version integer not null default 1,
industry_profile_updated_at timestamptz null
```

Contract:
- `industry_profile` references a code from the application registry. It is not a tax code. It remains nullable for existing businesses until an owner explicitly selects a profile; do not infer/backfill a vertical from `industry` or `giro`.
- `industry_secondary_profiles` stores up to three additional operating profiles for mixed businesses, excluding the primary profile and duplicates.
- `industry_profile_updated_at` changes in the same business-row update as the profile/config.
- `industry_config` contains only non-sensitive operational preferences. Example:
  ```json
  {
    "schemaVersion": 1,
    "channels": ["counter", "delivery"],
    "inventory": {
      "trackLots": true,
      "trackExpiry": true,
      "allowFractionalQuantity": true,
      "baseUnit": "un"
    },
    "commercial": {
      "priceLists": false,
      "volumePricing": true,
      "customerCredit": false
    },
    "locations": { "multipleWarehouses": false }
  }
  ```
- Do not store auth, payment secrets, medical/clinical records, employee personal data or credentials in this JSON.
- Validate allowed keys, enums and cross-field invariants on trusted server boundaries; the client type is not a security boundary.
- The profile/config is tenant-owned and cannot be used for authorization or RLS decisions.
- Use optimistic versioning or an audited update RPC for profile changes if multiple administrators can edit configuration concurrently.

## 3. Product family, variant and units

Do not encode a variant in the product name or create unrelated duplicate parent products.

Conceptual model:

### product_families
- `id`, `business_id`, `name`, `category_id`, `description`, `active`, timestamps.
- Represents the commercial family: e.g. "Tubo PVC sanitario".

### product_variants
- `id`, `business_id`, `family_id`, `sku`, `barcode`, `attributes jsonb`, `base_unit_id`, `active`.
- Unique constraints scoped to tenant for non-null SKU and barcode; enforce SKU normalization and concurrency atomically.
- Example attributes: `{"diameter_mm": 50, "length_m": 3, "pressure_class": "PN10", "material": "PVC"}`.
- Variant identity must be explicit and stable. Do not infer it solely from a display string.

### units_of_measure and product_unit_conversions
- Units are dimensioned: count, mass, length, area, volume, time, package.
- Conversion belongs to a product/variant where pack sizes differ. A case of 12 is not globally equivalent to every other case.
- Store conversion factors at adequate decimal precision. Never silently convert between incompatible dimensions.
- Purchases, sales, transfers, stocktakes and returns preserve the entered unit and normalized base quantity.

### inventory lots and serials
- Lot tracking is optional per product/category and records supplier, received date, expiry/manufacture dates and quantity balance.
- Serial tracking is one identity per serialized unit; do not conflate lot and serial tracking.
- FEFO is a picking suggestion only when expiry data exists; do not invent dates.
- Keep the current stock ledger and atomic inventory movements as source of truth. New variant-aware movement references must be tenant-consistent and concurrency-safe.

### BOM and production
- Recipe/BOM lines reference exact variants and normalized quantities.
- Production orders reserve inputs, record actual consumption/output, yield and scrap.
- Costing distinguishes standard, planned and actual costs; do not represent estimates as realized margin.

## 4. Compatibility and migration sequence

1. **Inventory discovery:** map every current product write/read path, POS, scanner, purchase receipt, transfer, stocktake, sales line, shipment, reports, RPC, trigger and unique constraint.
2. **Profile persistence:** add nullable primary-profile plus secondary-profile/config columns with safe defaults; no enum rewrite and no automatic backfill. Existing businesses remain unchanged until an owner selects a profile. New onboarding may recommend a profile but must preserve an explicit "not sure / decide later" path.
3. **Onboarding:** save the selected profile with the business row atomically; keep old clients working by selecting existing columns until deployment compatibility is confirmed.
4. **Variant schema:** introduce family/variant IDs and nullable legacy compatibility path. No bulk product rewrite in the first migration.
5. **Units:** introduce base units and conversion registry; pilot with a controlled set of new products first.
6. **Inventory ledger integration:** update all write paths together, with transactional validation, idempotency, lock order and concurrency tests.
7. **Lot/serial and sector workflows:** activate only for profiles that need them.
8. **Rollout:** feature flags per capability and per tenant; pilot with synthetic/demo data; measure reconciliation; staged activation; rollback path.

## 5. Required database test matrix

- Cross-tenant insert/update/read denied for every new relation.
- FK tenant consistency for business, family, variant, location and movement.
- SKU/barcode uniqueness under concurrent inserts and normalization edge cases.
- Fractional quantities preserve precision and do not truncate in RPCs, SQL numeric columns, TS types, POS, scanner, imports or exports.
- Conversion factors > 0; dimensions must be compatible; conversion round-trip within a documented precision.
- Stock cannot be oversold under concurrent sales; reservation, blocked and in-transit quantities reconcile.
- Lot expiry and FEFO never apply where no expiry exists.
- Serial uniqueness and lifecycle across receiving, sale, return and repair.
- Existing products and POS work unchanged before/after additive migrations.
- Config update cannot change tenant ownership, permissions or subscription entitlements.
- Audit log captures who changed profile/config and when.

## 6. Frontend contracts

- `getIndustryProfile(profileId)` is the only registry lookup used by UI.
- Components ask for capability flags, not direct string checks scattered across modules.
- A capability has lifecycle status: `available`, `pilot`, `planned`; only `available` is exposed as usable.
- The onboarding summary previews what will be activated, what is optional and what requires setup later.
- Profile selection must be editable under business settings and preserve existing operational data.
- The mobile onboarding uses a searchable list, not a giant grid of every sub-industry.

## 7. Release gates

No schema migration should be applied to production until:
- Supabase CLI creates the migration locally and migration history is reconciled.
- A development/preview database validates the DDL and backfill.
- pgTAP covers tenant isolation, constraints and compatibility.
- Generated TypeScript database types are refreshed.
- Existing stock concurrency and integrity suites remain green.
- Frontend typecheck, lint, unit tests, build, web QA and authenticated visual QA pass.
- Independent review confirms no change to existing RLS/security posture or payment flows.
