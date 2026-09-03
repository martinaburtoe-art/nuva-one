# Nüva One — Quality Gate Release Checklist

This document records the release invariants enforced by the final CI quality gate.

## Public surface

- `/` must load successfully.
- `/demo` must load successfully and remain interactive.
- `/pricing` must load successfully.
- Public routes must be runtime-clean and pass the configured accessibility checks.

## Responsive integrity

- Landing is exercised at 320, 390, 768, 1024 and 1440 CSS pixels.
- Page-level horizontal overflow is rejected.
- Intentionally scrollable child regions are not treated as page overflow.
- Reduced-motion behavior is explicitly exercised.

## Build and data integrity

- Migration integrity is verified before database tests.
- The lean local Supabase stack is started before pgTAP.
- Recovery from the complete migration history is exercised.
- Lint, typecheck, unit tests, dependency audit and production build must pass.

## Release rule

A green release requires the complete CI dependency chain to pass on the current PR head. Historical runs or stale merge refs do not count as release evidence.
