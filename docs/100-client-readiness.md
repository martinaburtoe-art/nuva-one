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
- [ ] Run staged 10 → 25 → 50 → 100 VU load test with a dedicated test account.
- [ ] Enable Supabase leaked-password protection in Auth settings.
- [ ] Review intentional GraphQL exposure warnings or disable GraphQL if unused.

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

Increase gradually to 25, 50, 75 and 100 VUs only after the previous level is healthy.

Target gate: p95 < 1500 ms, p99 < 3000 ms, zero cross-tenant access, and zero request/user failures.
