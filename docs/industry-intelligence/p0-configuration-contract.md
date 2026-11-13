# P0 sector configuration contract

Status: implemented in the PR branch as an application validator, additive tenant-scoped persistence migration, onboarding capture, business-settings editor and evidence-gated Resumen panel. This is not yet active in production: the migration has not been applied to the hosted Supabase project and the PR remains staged for review.

## Separation of concerns

1. Industry profile identifies what the tenant does operationally.
2. Configuration records non-sensitive operating context explicitly supplied by the owner.
3. Capability readiness is evidence-backed product availability.
4. Authorization and subscription entitlements remain independent and authoritative.
5. SII giro/activity data remains separate from the operational profile.

A preference cannot enable a feature, grant access, bypass a module guard, or change tenant boundaries.

## Profile coverage

The catalogue contains 24 operational profiles. Onboarding and business settings can select a primary profile and capture explicit yes/no answers to that profile's operational questions. Unknown/unanswered responses are not inferred or persisted. Changing the selected profile clears stale answers before saving.

Detailed operational configuration is deliberately P0-only for:
- Ferretería y materiales.
- Almacén y minimarket.
- Distribuidora y mayorista.

P1/P2 profiles can be identified and used for sector context, but the detailed P0 configuration validator rejects them until their own versioned schemas exist.

## P0 configuration rules

- Reject unknown profile IDs, fields, channels and units.
- Reject wrong runtime types and incompatible measurement dimensions.
- Deduplicate channel and unit lists deterministically.
- Defaults are conservative and opt-in.
- Require lot tracking before expiry tracking.
- Never infer package conversion ratios. A box, sack, roll or pallet requires an explicit product-specific conversion.
- Keep shipment dispatch separate from scheduled dispatch: an existing shipment workflow does not prove calendar scheduling, capacity allocation or route-slot management.
- Return requested, available and planned capabilities separately.
- Only evidence-backed available capabilities may be exposed as enabled.
- Configuration is not an authorization boundary.

## Tenant persistence

The additive migration `20261112090000_business_industry_profile_persistence.sql` adds:
- `industry_profile`
- `industry_secondary_profiles`
- `industry_config`
- `industry_config_version`
- `industry_profile_updated_at`

It preserves the existing `businesses.industry` macro enum and the independent `giro` field. It performs no profile inference/backfill and does not alter RLS, grants, existing triggers or tenant records. A pgTAP contract test is included in `117_business_industry_profile_persistence.sql`.

The migration is present in the PR branch only. It has been rebuilt and tested against an ephemeral local Supabase instance in CI; it has not been applied to hosted production.

## UI and persistence behaviour

- Onboarding exposes the primary sector selector and explicit operational questions.
- Business settings exposes the same profile for authorized owners/admins, including later edits.
- A missing migration is detected and shown as a non-destructive pending-schema state.
- The Resumen panel reads the active tenant's profile separately and handles missing columns without breaking the dashboard.
- Sector metrics are status manifests, not fabricated KPI values. Sources without sufficient evidence remain unavailable or planned.
- The settings editor updates only the active business row and only when the existing business-management role guard allows editing.

## Required release gates

1. Review the additive migration and its pgTAP assertions.
2. Run the complete PR workflow (catalog tests, typecheck, production build and full local Supabase/pgTAP suite).
3. Generate one consolidated preview after the deployment quota window, then perform authenticated desktop/mobile QA of onboarding, settings and Resumen.
4. Review tenant isolation and the existing role/RLS policies before production activation; this change does not replace those controls.
5. Implement real inventory, pricing, lot and dispatch workflows before activating their capability flags.
6. Apply the migration to hosted production only after explicit release authorization and a verified backup/recovery plan.
7. Preserve POS, scanner, stock concurrency, checkout, existing tenant data and mobile navigation.

## Cost and deployment controls

CI uses an ephemeral local Supabase stack on the GitHub-hosted runner. No hosted Supabase branch, paid integration or Vercel deployment is required for each code commit. Consolidate visual deployment and production promotion into a single release window.
