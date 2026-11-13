# Nüva One — batch release runbook (Resumen + PWA + inteligencia sectorial)

**Purpose:** avoid repeated Vercel deployment attempts while the project is under a deployment quota/rate limit. Keep all work in GitHub branches and run CI without requesting Vercel deployments until the complete release candidate is ready.

## Current dependency chain

- PR #316: Resumen, responsive navigation, PWA install/update lifecycle.
- PR #318: Chilean industry catalogue and profile/capability contracts; based on #316.
- PR #321: tenant persistence, onboarding, settings editor and evidence-gated Resumen panel; based on #318.

Do not merge these three PRs one by one into `main`. Each merge can trigger a separate production deployment.

## Single-preview / single-production strategy

1. Keep all three PRs open and unmerged while implementation and GitHub Actions validation continue.
2. Freeze feature work at a reviewed commit. Record its exact SHA.
3. Retarget the top-level PR (#321) from `feat/industry-intelligence-chile-20261112` to `main`. Its head branch already contains the ancestry of #318 and #316, so this creates one aggregate diff against production without cherry-picking or rewriting history.
4. Confirm the aggregate PR diff includes the complete scope of #316, #318 and #321, and rerun the full required CI on that exact SHA.
5. Close #316 and #318 as superseded by the aggregate PR only after confirming the aggregate diff and CI. Do not discard their commits.
6. Request exactly one Vercel preview for the aggregate PR after the quota window is clear. Verify the deployment SHA matches the recorded SHA. Do not use an older preview as evidence for the aggregate.
7. Perform authenticated desktop/mobile QA and the Android PWA install/update test against that preview.
8. Obtain explicit release approval. Apply the additive Supabase migration only after a backup/recovery check and approval; do not create a hosted Supabase branch or paid resource without authorization.
9. Merge the aggregate PR once. Verify the single production deployment SHA, production smoke, dashboard, onboarding, settings and tenant isolation.
10. Keep a rollback decision and migration compatibility note attached to the release record.

## No-cost work allowed before Vercel quota clears

- GitHub commits and branch-based code review.
- GitHub Actions tests, TypeScript, production build and ephemeral local Supabase/pgTAP.
- Documentation, static code review and test-matrix improvements.

## Actions intentionally prohibited without explicit approval

- Applying migrations to production.
- Creating hosted Supabase branches or paid infrastructure.
- Forcing or repeatedly retrying Vercel deployments.
- Merging a partial PR stack into `main`.
- Claiming a feature is live before production SHA and runtime checks confirm it.

## Evidence required for release

- Exact commit SHA and aggregate PR diff.
- Green CI on that SHA: unit tests, typecheck, build, migration verification and full pgTAP.
- Vercel preview URL and deployment record for the same SHA.
- Authenticated desktop/mobile visual QA.
- Android installation and controlled-update evidence.
- Production migration result, if approved.
- Production deployment SHA and post-deploy smoke evidence.
