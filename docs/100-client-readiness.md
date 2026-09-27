# Nüva One — 100-client readiness

## Gates

- [x] Tenant-scoped queries use `business_id` and RLS.
- [x] Sensitive tables revoked from `anon`.
- [x] Foreign-key and tenant/date indexes added.
- [x] RLS `auth.uid()` / `auth.jwt()` init-plan optimization applied.
- [x] `businesses_public` uses `security_invoker`.
- [x] Security-definer functions used by the app have explicit `search_path` and `authenticated` execution grants.
- [x] Guarded multi-tenant load-test harness committed at `scripts/load-test.mjs`.
- [x] Production `/dashboard` no longer renders Nüva Operating Pulse.
- [x] Production `/customers` renders the CRM Operating Pulse through `PageHeader`.
- [x] Nüva Action Queue execution loop supports `approved → executing → completed/failed` with an authenticated, tenant-scoped server route and outcome recording.
- [x] Run staged 10 → 25 → 50 → 100 VU load test with an ephemeral validation fixture; 1,850/1,850 requests passed, p95 max 366 ms, p99 max 547 ms, and inventory concurrency passed at 25/50/100 VU with no oversell.
- [ ] Enable Supabase leaked-password protection in Auth settings.
- [x] Review intentional GraphQL exposure warnings; unused GraphQL surface was removed and the database has no public GraphQL-backed business tables requiring this gate.

## Load test

Use a dedicated non-production test account and never commit its credentials.

```bash
LOAD_TEST_CONFIRM=true \
LOAD_TEST_VUS=10 \
LOAD_TEST_ITERATIONS=3 \
LOAD_TEST_EMAIL='load-test@example.com' \
LOAD_TEST_PASSWORD='use-a-dedicated-secret' \
node scripts/load-test.mjs
```

Increase gradually to 25, 50 and 100 VUs only after the previous level is healthy. The latest ephemeral gate completed successfully across 10/25/50/100 VU, including inventory concurrency and recovery.

Target gate: p95 < 1500 ms, p99 < 3000 ms, zero cross-tenant access, and zero request/user failures.
