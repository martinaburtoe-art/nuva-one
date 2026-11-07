# Inngest foundation — Nüva One

## Scope

This change introduces the Inngest SDK and the TanStack Start HTTP serving
endpoint at `/api/inngest`. It registers one deliberately side-effect-free
function, `nuva-system-ping`, triggered by `nuva/system.ping`.

The function only returns an acknowledgement and timestamp. It does not call
Supabase, claim or finish Agency tasks, access Mercado Pago, modify inventory,
send notifications, or invoke external providers.

## Runtime setup

- Local development: run the Nüva app and the Inngest Dev Server, then point
  the Dev Server at the local `/api/inngest` endpoint.
- Hosted environment: configure the Inngest app to sync with
  `https://<deployment-host>/api/inngest`.
- Keep `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in server-side
  environment configuration only. Never expose them through Vite-prefixed
  variables or client bundles.

## Explicitly not migrated

The existing GitHub Actions Agency worker, Supabase task/lease RPCs,
agency scheduler/supervisor, Owner Console execution path, Vercel cron jobs,
billing, and Intelligence jobs remain unchanged. Do not enable production
Agency task processing through Inngest until a separate migration plan covers
idempotency, lease ownership, retries, concurrency limits, observability,
rollback, and duplicate execution protection.

## Verification gate

Before enabling hosted sync, confirm the dependency lockfile is regenerated
from this branch with the repository's pinned npm version, then run
`npm ci`, `npm run typecheck`, `npm test -- --run`, and `npm run build`.
No production secrets or deployment configuration are changed by this PR.
