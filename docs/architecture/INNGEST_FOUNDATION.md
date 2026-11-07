# Inngest foundation — Nüva One

## Runtime and endpoint

- The server-only client uses the application ID `nuva-one`.
- The TanStack Start endpoint is `/api/inngest` and supports GET, POST and PUT.
- The route runs on Vercel's Node.js serverless runtime.
- If a read-only specialist needs a repository file that is not bundled, its reader fetches only an explicit allowlist from `raw.githubusercontent.com` at the exact `VERCEL_GIT_COMMIT_SHA` of that deployment. No `.env` files or arbitrary paths are remotely readable.

## Registered functions

- `nuva-system-ping`: side-effect-free event delivery check.
- Nine read-only Agency specialists (finance, sales, supply, people, growth, orchestrator, compliance, security and UX) run on a five-minute cron.
- Each specialist claims at most one task through `public.agency_claim_task`, executes the registered read-only specialist, and persists its result through `public.agency_finish_task`.
- Claims use the existing 30-minute Supabase lease. The database's atomic claim and unique active-lease constraints remain authoritative.
- Inngest limits Agency work to five concurrent steps globally and one active step per specialist.

## Staged activation and fallback

- `NUVA_INNGEST_AGENCY_ENABLED` defaults to disabled. Workers return before accessing Supabase unless this value is exactly `true`.
- The existing GitHub Actions worker remains available as a fallback during certification. Both systems use the same Supabase claim/lease RPCs, so they cannot claim the same task.
- The constructor, QA and release specialists remain on GitHub Actions because they depend on local syntax/test/git execution. They are intentionally not registered as Vercel Inngest workers.
- No migration, RLS policy, inventory, billing or business data is changed by this integration.

## Required environment

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: already configured server-side for both Vercel Preview and Production; used only to call the restricted Agency RPCs.
- `INNGEST_SIGNING_KEY`: required to sync and authenticate the hosted Inngest endpoint.
- `NUVA_INNGEST_AGENCY_ENABLED`: keep unset or `false` until the Inngest app has synced and the preview has been certified; set to `true` only for the intended environment.
- `INNGEST_EVENT_KEY`: not required for the current cron-only workers. Add it only when Nüva begins sending outbound events from the application.

## Activation gate

1. Add the Inngest signing key to Vercel Preview.
2. Sync the Preview endpoint at `https://<preview-host>/api/inngest`.
3. Confirm all ten registered functions appear and the ping function succeeds.
4. Enable `NUVA_INNGEST_AGENCY_ENABLED=true` in Preview only.
5. Verify claims, execution results, retries, concurrency and lease recovery in Supabase and Inngest.
6. Promote the same configuration to Production only after Preview certification.

Do not remove the GitHub Actions fallback until the Inngest workers have passed the production observation window and rollback has been tested.
