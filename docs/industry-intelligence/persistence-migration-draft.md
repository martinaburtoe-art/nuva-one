# Tenant persistence draft — industry profiles

**Status:** additive migration staged in PR #321 at `supabase/migrations/20261112090000_business_industry_profile_persistence.sql`; pgTAP contract staged at `supabase/tests/database/117_business_industry_profile_persistence.sql`. Neither has been applied to production or a hosted Supabase branch.
**Schema inspected:** production project schema metadata, 12 November 2026.
**Scope:** additive columns on the existing `public.businesses` row; no new table, no RLS rewrite, no production data mutation.

## Verified current schema facts

The current `public.businesses` table has:
- `id uuid primary key`
- `industry business_industry NOT NULL DEFAULT 'other'`
- `giro text NULL` (tax/business activity description)
- `owner_id uuid NOT NULL`
- `updated_at timestamptz NOT NULL`

The current row policies on `businesses` already scope authenticated reads to public-enabled businesses, the owner, or `private.is_business_member(id, auth.uid())`. Inserts and updates are owner-scoped. The profile must therefore remain a business-level attribute on this existing row; it must never be stored in user metadata or browser storage as the source of truth.

The existing seven-value `business_industry` enum is a macro classification. It is not suitable for the 23 operational verticals. `giro` is not a safe place for the operational profile because it represents the tax/business activity description.

## Proposed additive columns

| Column | Type | Default | Purpose |
|---|---|---|---|
| `industry_profile` | `text` nullable | `NULL` | Stable primary operational profile slug |
| `industry_secondary_profiles` | `text[]` | `{}` | Optional additional operating profiles for mixed businesses |
| `industry_config` | `jsonb` | `{}` | Sector-specific answers and business overrides |
| `industry_config_version` | `integer` | `1` | Version of the configuration contract |
| `industry_profile_updated_at` | `timestamptz` nullable | `NULL` | Explicit timestamp for profile/config changes |

Existing businesses remain valid: the primary profile stays NULL until an owner chooses one. No guessed backfill from `industry` or `giro`.

## Migration implementation and review notes

The executable SQL is maintained in the migration file above, not copied into this design document. It adds only nullable/defaulted business columns and guarded check constraints. It does not alter RLS policies, grants, triggers, existing rows, `business_industry`, or `giro`.

```sql
alter table public.businesses
  add column if not exists industry_profile text,
  add column if not exists industry_secondary_profiles text[] not null default '{}',
  add column if not exists industry_config jsonb not null default '{}'::jsonb,
  add column if not exists industry_config_version integer not null default 1,
  add column if not exists industry_profile_updated_at timestamptz;

alter table public.businesses
  add constraint businesses_industry_profile_slug_check
  check (
    industry_profile is null or industry_profile in (
      'hardware_store',
      'neighborhood_grocery',
      'beverage_store',
      'produce_market',
      'butcher_fishmonger',
      'apparel_footwear',
      'books_stationery_electronics',
      'wholesale_distribution',
      'restaurant_cafe',
      'bakery_pastry',
      'manufacturing_workshop',
      'auto_repair_parts',
      'agriculture_agroinputs',
      'transport_logistics',
      'construction_contractor',
      'professional_services',
      'beauty_wellness',
      'veterinary_pet',
      'lodging_tourism',
      'equipment_rental',
      'education_fitness',
      'field_technical_service',
      'general_business'
    )
  ),
  add constraint businesses_industry_secondary_profiles_check
  check (
    cardinality(industry_secondary_profiles) <= 3
    and array_position(industry_secondary_profiles, null) is null
    and (
      industry_profile is null
      or not (industry_profile = any(industry_secondary_profiles))
    )
    and industry_secondary_profiles <@ array[
      'hardware_store',
      'neighborhood_grocery',
      'beverage_store',
      'produce_market',
      'butcher_fishmonger',
      'apparel_footwear',
      'books_stationery_electronics',
      'wholesale_distribution',
      'restaurant_cafe',
      'bakery_pastry',
      'manufacturing_workshop',
      'auto_repair_parts',
      'agriculture_agroinputs',
      'transport_logistics',
      'construction_contractor',
      'professional_services',
      'beauty_wellness',
      'veterinary_pet',
      'lodging_tourism',
      'equipment_rental',
      'education_fitness',
      'field_technical_service',
      'general_business'
    ]::text[]
  ),
  add constraint businesses_industry_config_object_check
  check (jsonb_typeof(industry_config) = 'object'),
  add constraint businesses_industry_config_version_check
  check (industry_config_version > 0);
```

Before turning this into a migration, make the constraint creation idempotent with guarded `DO` blocks or an equivalent repository convention. Also decide whether the maximum of three secondary profiles is a product rule or should be removed. The app must reject duplicate secondary profile IDs before writing; the draft SQL check validates allowed values, count and primary/secondary separation but does not itself reject duplicate array elements.

## RLS and tenant isolation

- Do not create a new table for the first release.
- Do not alter or recreate existing `businesses` RLS policies.
- Do not add a `SECURITY DEFINER` helper.
- Existing row-level policies continue to apply to all columns of the row. The owner-scoped update policy remains the authority for editing these fields.
- Do not use `user_metadata`, localStorage, or an unscoped profile table as the authoritative store.
- Keep SII activity codes separate. A profile slug is operational configuration, not a tax classification.
- Confirm Data API grants for the existing table remain sufficient; the November 2026 Supabase default that prevents new tables from being exposed does not require creating a new table here.

## Configuration contract

Recommended JSON shape after validation in application code:

```json
{
  "schemaVersion": 1,
  "answers": {
    "sellsByLength": true,
    "needsJobQuotes": true,
    "hasMultipleLocations": false
  },
  "overrides": {
    "enabledCapabilities": []
  }
}
```

Rules:
1. Only store sector-specific operational preferences here; avoid customer, employee, payment, or clinical records.
2. Onboarding answers use stable keys `operation_1`…`operation_n` from the selected profile registry. Persist only explicit yes/no answers as booleans; unanswered questions are omitted. Switching the profile resets the draft answers.
2. Validate the shape with the app's schema validator at the write boundary.
3. Store only answers actually supplied by the owner. Unknown answers remain absent, not false.
4. Apply profile defaults first, then owner overrides; a user cannot override a capability's release gate from planned to available.
5. Increment `industry_config_version` when the persisted shape changes.
6. Record `industry_profile_updated_at` in the same business update.

## Required database tests before merge

1. All five columns exist with expected types/defaults.
2. Existing businesses with NULL `industry_profile` remain readable and unchanged.
3. A known profile slug is accepted; an unknown slug is rejected.
4. Secondary profiles accept known slugs, reject unknown slugs, reject the primary profile, and enforce the configured maximum.
5. Non-object `industry_config` is rejected; object JSON is accepted.
6. Zero/negative config versions are rejected.
7. An authenticated owner can update their business profile.
8. A different business owner cannot read or modify the first business's profile through the existing policies.
9. A non-owner member's update behavior remains exactly as before; no permission expansion.
10. The existing `public.nuva_core_integrity_audit()` remains unchanged and passing.

## Rollout order

1. Validate migration history with `npm run verify:migrations`.
2. Run the repository's ephemeral local Supabase CI stack, `supabase db reset --local`, and pgTAP; this uses GitHub-hosted CI, not a paid Supabase branch.
3. Generate database types from the clean local schema and run full typecheck/build.
4. Keep onboarding feature-gated until the deployed database exposes the new columns.
5. Validate authenticated owner writes and cross-tenant isolation in the ephemeral database.
6. Obtain independent review and preview verification for the exact commit.
7. Only after explicit approval, schedule production migration. Do not create a hosted Supabase branch or incur a new service cost without approval.

## Explicit non-goals for this first migration

- No product variant tables, fractional inventory, unit conversions, lot/expiry, serial tracking, multi-warehouse, recipe/BOM, production orders or customer price lists.
- No inferred SII activity code.
- No change to existing stock, inventory movements, sales, finance, subscriptions, or RLS.
- No automatic activation of a feature merely because the chosen industry profile lists it.
