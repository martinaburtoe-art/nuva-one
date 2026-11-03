# BLOCKERS — Bloqueos identificados en SPRINT 0

Fecha: 2026-11-03.

## B-001: PR #269 no puede mergear (conflictos con main) — RESUELTO

- Conflictos resueltos con merge de origin/main en rama fix/reproducible-npm-ci-20261027 (commit 4a6ec806)
- PR #269 ahora MERGEABLE, CI en ejecución (5 checks)
- Pendiente: autorización de Don Martín para mergear a main

## B-002: Supabase service_role permissions — RESUELTO

- Estaba bloqueando agency_tasks upsert (42501 permission denied)
- Corregido con GRANT ALL en las 6 tablas de agency
- Verificado con ciclo completo 7/7 OK

## B-003: PR #270 tiene fallo de lint/typecheck/test/audit/build

- PR #270 es MERGEABLE pero falla el check combinado de lint/typecheck/test/audit/build
- El mismo error SPECIALISTS[agentId].execute is not a function fue corregido en PR #269 (rama fix/reproducible-npm-ci-20261027, commit 2f371e39)
- PR #270 no incluye ese fix aún; requiere aplicarlo antes de mergear

## B-004: Worker duradero no ejecutable localmente vía HTTP

- agency-durable-worker.mjs requiere GITHUB_RUN_ID real de GitHub Actions CI para ejecución vía API
- Fallo de test corrigido: executeSpecialist ahora recibe { signal: AbortSignal } como segundo argumento
- Despacho directo de especialistas verificado localmente (SPECIALISTS[agentId](task) funciona)
- Alternativa operativa: persistencia directa a Supabase vía agency-persist-supabase.mjs (verificada OK)

## B-005: Archivos sin seguir (untracked)

- artifacts/overnight/, bun.lock.backup, package.json.bak, scripts/__pycache__/, supabase/.temp/, test-results/, tests/__pycache__/, tsconfig.json.bak, vite.config.ts.bak
- Revisar si deben incluirse o descartarse

## B-006: PRs en DRAFT sin revisar

- #271, #272 — DRAFT, sin checks ejecutados
