# Nüva One — 100-client production readiness

## Target

Certify the platform for 100 business tenants, with 1–5 users per tenant and normal SaaS concurrency.

## Implemented in this hardening pass

- Anonymous access removed from private application tables.
- Anonymous execution removed from application SECURITY DEFINER wrappers and trigger-only RPCs.
- `businesses_public` changed to `security_invoker=true` and protected by a dedicated anonymous RLS policy.
- Anonymous access to `businesses` is column-scoped to explicitly public fields only.
- Foreign-key coverage indexes added for advisor findings.
- Tenant-first chronological indexes added for CRM, finance, billing, WhatsApp and AI access patterns.
- RLS auth helper calls normalized to `(select auth.uid())` / `(select auth.jwt())` where applicable.
- Duplicate audit-log SELECT branch removed.
- Duplicate permissive SELECT branches for invitations and shifts consolidated.
- Confirmed duplicate indexes removed.
- Dashboard KPI aggregation moved from browser-side row reduction to a `security invoker` Postgres RPC.
- A dependency-free load harness was added as `npm run load:test`.

## Remaining certification gates

1. Enable Supabase leaked-password protection.
2. Review the remaining SECURITY DEFINER functions individually.
3. Keep the public showcase view under explicit review whenever its columns change.
4. Run authenticated load tests using a dedicated non-production/test tenant.
5. Verify cross-tenant isolation with at least two independent tenants.
6. Capture p50/p95/p99 latency, 5xx rate, database latency and AI/WhatsApp error rates.
7. Only then declare the 100-client capacity target certified.

## Load test examples

Public application smoke/load test:

```bash
BASE_URL=https://nuva-one.vercel.app LOAD_CONCURRENCY=100 LOAD_ITERATIONS=5 npm run load:test
```

Authenticated KPI/database test using a dedicated test user:

```bash
BASE_URL=https://nuva-one.vercel.app \
SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_ANON_KEY=<publishable-key> \
LOAD_TEST_EMAIL=<dedicated-load-user> \
LOAD_TEST_PASSWORD=<dedicated-load-password> \
LOAD_TEST_BUSINESS_ID=<dedicated-load-business> \
LOAD_TARGET=dashboard-kpis \
LOAD_CONCURRENCY=100 LOAD_ITERATIONS=5 npm run load:test
```

Never use a real customer's credentials for load testing.
