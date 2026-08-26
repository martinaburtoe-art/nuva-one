# Nüva One — Beta Readiness Runbook

## Purpose

This runbook is the final operational gate before controlled beta testing. It intentionally distinguishes code/infrastructure checks that CI can prove from external controls that require a hosted credential or a real staging environment.

## Green gates already implemented

- CI migration filename integrity check.
- Reproducible local Supabase startup in CI before pgTAP.
- Dependency audit in CI.
- Tenant authorization on AI chat.
- Monthly AI usage enforcement.
- Provider failover/circuit breaker architecture.
- AI usage and provider telemetry.
- Owner Control Tower.
- Production runtime error monitoring.
- Staged load-test runner: 10, 25, 50, 100, 150 and 250 VUs.
- Explicit confirmation guard on load testing.

## Required before opening beta

### A. CI

- [ ] Latest `main` CI run is green end-to-end.
- [ ] pgTAP completes successfully on a clean Supabase stack.
- [ ] Typecheck, lint, unit tests and build are green.

### B. Hosted Auth

- [ ] Supabase Auth `password_hibp_enabled=true`.
- [ ] Confirm password minimum length and required characters are appropriate for beta.
- [ ] Confirm email verification policy is intentional.
- [ ] Confirm production redirect URLs contain only approved domains.

Leaked-password protection is a hosted Auth configuration, not a PostgreSQL migration. The repository contains a migration marker for history parity, but the hosted setting must be verified through Supabase Auth configuration.

### C. AI providers

- [ ] Primary provider key configured.
- [ ] At least one independent fallback key configured.
- [ ] Provider price variables configured for every enabled provider.
- [ ] Generate one successful primary request and one controlled fallback test.
- [ ] Verify `ai_usage_events` records provider, model, tokens, attempts and fallback flag.

### D. Staging load test

Use a dedicated staging/preview project and synthetic account/business data. Never use a production owner account for destructive or sustained load tests.

Required sequence:

```text
10 VUs → 25 VUs → 50 VUs → 100 VUs
```

Stop on any user/request failure. Record p50, p95, p99, error rate and total duration for each phase.

Stress phases:

```text
150 VUs → 250 VUs
```

are for capacity discovery, not beta acceptance.

### E. Recovery

- [ ] Confirm Supabase backups are active.
- [ ] Perform one restore/recovery drill in non-production.
- [ ] Verify migrations can rebuild a clean database.
- [ ] Verify application recovery after database restoration.

### F. Control Tower

Before beta, Control Tower must show:

- platform metrics;
- AI request/token/cost metrics;
- provider distribution;
- fallback count;
- no unresolved critical incident;
- load-test evidence attached to the release record.

## Beta acceptance rule

Nüva One is not considered beta-ready solely because the UI or Vercel deployment is healthy. The release is accepted only when all hosted Auth, provider configuration, staging load-test and recovery gates above have objective evidence.
