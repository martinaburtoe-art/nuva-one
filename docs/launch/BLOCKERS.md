# BLOCKERS — Bloqueos identificados en SPRINT 0

Fecha: 2026-11-03.

## B-001: PR #269 no puede mergear (conflictos con main) — RESUELTO

- Conflictos resueltos con merge de origin/main en rama fix/reproducible-npm-ci-20261027 (commit 4a6ec806)
- PR #269 ahora MERGEABLE, CI 8/8 PASS (todos los checks verdes)
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

## B-007: Edge Function de OIDC no actualizada (T-31/T-32) — BLOQUEADO (sin autorización de deploy)
- Código de endurecimiento OIDC listo en rama fix/reproducible-npm-ci-20261027 (commit e28f67e)
- Tests 14/14 PASS (worker-oidc-claims.test.ts)
- Edge Function remota aún en v16 (valida solo issuer, repository, run_id, agent_id)
- Endurecimiento agrega validación de: audience, repository_owner, workflow_ref, ref, event_name, actor
- T-32 (despliegue de la Edge Function) requiere autorización explícita de Don Martín

## B-008: Migración de grants remotos no aplicada (T-20) — BLOQUEADO (sin autorización de BD remota)
- Migración 20261030130000_agency_service_role_privileges.sql preparada localmente (commit a3fa219d)
- No aplicada al proyecto remoto vnzyecnbdqbfuxawzrda
- Requiere aplicación remota vía supabase db push (necesita credenciales de Supabase y autorización)
- Bloquea T-21 (scheduler recurrente) y T-22 (Owner Console)
