# Inngest foundation — Nüva One

## Runtime and endpoint

- The server-only client uses the application ID `nuva-one`.
- The TanStack Start endpoint is `/api/inngest` and supports GET, POST and PUT.
- The route runs on Vercel's Node.js serverless runtime.
- If a read-only specialist needs a repository file that is not bundled, its reader fetches only an explicit allowlist from `raw.githubusercontent.com` at the exact `VERCEL_GIT_COMMIT_SHA` of that deployment. Vercel's **Automatically expose System Environment Variables** setting is enabled for this project; the worker fails closed before claiming a task if the deployment SHA is missing. No `.env` files or arbitrary paths are remotely readable.

## Registered functions

- `nuva-system-ping`: side-effect-free event delivery check.
- Nine read-only Agency specialists (finance, sales, supply, people, growth, orchestrator, compliance, security and UX) run on a five-minute cron.
- Each specialist claims at most one task through the task-scoped `public.agency_claim_task_by_id` during certification or the general `public.agency_claim_task` only after a separate explicit rollout gate; it executes the registered read-only specialist and persists through `public.agency_finish_task`.
- Claims use the existing 30-minute Supabase lease. The database's atomic claim and unique active-lease constraints remain authoritative.
- Both general and task-scoped claim RPCs issue 256-bit cryptographically random lease tokens; claim RPC execution remains service-role-only.
- For certification, set `NUVA_INNGEST_AGENCY_TEST_TASK_ID` to one exact UUID. Workers then call `agency_claim_task_by_id`, which can claim, recover and lease only that task; it never sweeps unrelated leases or claims another queued task. Remove the variable after the one-task test. An unset task ID does not authorize global claims.
- Inngest limits Agency work to five concurrent steps globally and one active step per specialist.

## Staged activation and fallback

- `NUVA_INNGEST_AGENCY_ENABLED` defaults to disabled. Workers return before accessing Supabase unless this value is exactly `true`.
- `NUVA_INNGEST_AGENCY_ALLOW_GENERAL_CLAIM` defaults to `false`. Without a task-scoped UUID, workers remain blocked unless this second flag is explicitly set to `true` after a separate rollout approval.
- The GitHub Actions durable worker remains a fallback, but it also claims the global queue through worker-control. It is skipped unless the separate repository variable `NUVA_AGENCY_DURABLE_ALLOW_GENERAL_CLAIM=true`; keep that variable unset during one-task Inngest certification. Both systems use the same Supabase claim/lease RPCs, so they cannot claim the same task.
- The constructor, QA and release specialists remain on GitHub Actions because they depend on local syntax/test/git execution. They are intentionally not registered as Vercel Inngest workers.
- The migrations add the task-scoped claim RPC, replace MD5-derived lease tokens with 256-bit CSPRNG tokens in both claim RPCs, and make task finalization idempotent for durable retries. They do not change RLS, inventory, billing or business records.

## Required environment

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: already configured server-side for both Vercel Preview and Production; used only to call the restricted Agency RPCs.
- `INNGEST_SIGNING_KEY`: required to sync and authenticate the hosted Inngest endpoint.
- `NUVA_INNGEST_AGENCY_ENABLED`: keep unset or `false` until the Inngest app has synced and the task-scoped test is prepared; set to `true` only for the short certification window.
- `NUVA_INNGEST_AGENCY_TEST_TASK_ID`: exact UUID used to restrict all worker claims to one certification task; never point it at an existing business task.
- `NUVA_INNGEST_AGENCY_ALLOW_GENERAL_CLAIM`: keep `false` through certification; set to `true` only after a separate explicit approval for unrestricted Inngest queue processing.
- `NUVA_AGENCY_DURABLE_ALLOW_GENERAL_CLAIM`: GitHub repository variable, keep unset/`false`; set to `true` only for an explicitly approved global-queue fallback run.
- `INNGEST_EVENT_KEY`: not required for the current cron-only workers. Add it only when Nüva begins sending outbound events from the application.

## Activation gate

1. Keep both `NUVA_INNGEST_AGENCY_ENABLED=false` and `NUVA_INNGEST_AGENCY_ALLOW_GENERAL_CLAIM=false` while preparing certification. Do not enable the global queue against production backlog.
2. Apply the task-scoped claim migration and create one clearly labelled, read-only certification mission/task assigned to a single specialist.
3. Set `NUVA_INNGEST_AGENCY_TEST_TASK_ID` to that task UUID and enable the worker flag only for the short certification window. All specialist cron functions are constrained to that same UUID; only the matching agent can claim it.
4. Verify the exact task's claim, execution, completion event, released lease and unchanged status/counts for every other task. Then set `NUVA_INNGEST_AGENCY_ENABLED=false`, remove the task ID variable, and confirm no active leases remain; keep general claims disabled.
5. Confirm the already-synced Production endpoint still lists all ten functions and the system ping completes.
6. Verify the one-task claim, specialist execution, completion event, released lease and unchanged backlog in Supabase and Inngest.
7. Immediately restore `NUVA_INNGEST_AGENCY_ENABLED=false` and remove `NUVA_INNGEST_AGENCY_TEST_TASK_ID`.
8. Do not switch to unrestricted queue processing until a separate rollout review approves it and `NUVA_INNGEST_AGENCY_ALLOW_GENERAL_CLAIM=true` is deliberately set.

Do not remove the GitHub Actions fallback until the Inngest workers have passed the production observation window and rollback has been tested. Keep both global-claim flags disabled until the corresponding rollout is explicitly approved.
