# Block B — Secret and dependency audit preparation

Status: preliminary evidence only. No PASS is declared for repository history scanning or npm vulnerability resolution from this preparation pass.

## Secrets

### Repository hygiene observed

- `.gitignore` excludes `.env`, `.env.local`, and `.env.*.local`.
- `.env.example` documents server-only credentials as empty placeholders, including Supabase service role, Mercado Pago, Stripe, Meta/WhatsApp, AI providers, and cron secrets.
- The example file explicitly warns not to commit the real `.env`.

### Required production audit

| Check | Status | Evidence required |
|---|---|---|
| Working-tree secret scan | PENDING | Run secret scanner over the complete checkout |
| Git-history secret scan | PENDING | Scan all reachable commits, not only current files |
| Supabase service-role exposure | PENDING | Confirm no live service-role/JWT credential exists in source/history |
| Mercado Pago credentials | PENDING | Confirm no live access/webhook secret exists in source/history |
| Stripe credentials | PENDING | Confirm no live secret/webhook secret exists in source/history |
| Meta/WhatsApp credentials | PENDING | Confirm no live app secret/access token/verify token exists in source/history |
| AI provider credentials | PENDING | Confirm no live provider key exists in source/history |
| Cron secret | PENDING | Confirm no live cron secret exists in source/history |

A static repository-connector scan is not treated as equivalent to a full history scanner. The available connector does not expose GitHub secret-scanning alerts, and this runtime has no network access for a local clone.

## Dependencies

The repository contains both `package.json` and `package-lock.json` (lockfile version 3). `package.json` also contains explicit security-related overrides for `brace-expansion`, `dompurify`, `js-yaml`, `nanoid`, `postcss`, and `tar`.

| Check | Status | Evidence |
|---|---|---|
| Lockfile present | PASS | `package-lock.json`, lockfileVersion 3 |
| Explicit security overrides reviewed | PENDING | Requires `npm audit`/advisory comparison against installed dependency graph |
| Critical CVEs | PENDING | Requires current npm advisory data |
| High CVEs | PENDING | Requires current npm advisory data |
| Dependabot configuration | PENDING | No `.github/dependabot.yml` was found on `main` during this preparation pass |
| Safe dependency upgrades | PENDING | Must be based on actual audit output and CI verification |

## Runtime limitation

A local `git` connectivity check was performed in the execution environment: there is no repository checkout and `git ls-remote` cannot resolve `github.com`. Therefore no claim is made that `npm audit`, full history scanning, or a local Playwright run was executed here.
