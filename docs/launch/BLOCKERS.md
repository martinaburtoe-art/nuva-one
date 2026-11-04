# BLOCKERS — Bloqueos identificados en SPRINT 0

Fecha: 2026-11-03.

## B-001: PR #269 no puede mergear (conflictos con main) — RESUELTO

- Conflictos resueltos con merge de origin/main en rama fix/reproducible-npm-ci-20261027 (commit 4a6ec806)
- PR #269 ahora MERGEABLE, CI 8/8 PASS (todos los checks verdes)
- Pendiente: autorización de Don Martín para mergear a main

## B-002: Supabase service_role permissions — NO RESUELTO en remoto

- Migración 20261030130000_agency_service_role_privileges.sql preparada localmente (commit a3fa219d) con privilegios de mínimo privilegio (no GRANT ALL):
  - agency_missions: SELECT, INSERT, UPDATE
  - agency_tasks: SELECT, INSERT
  - agency_events: SELECT, INSERT
  - agency_agent_leases: SELECT
  - agency_approvals: SELECT, INSERT, UPDATE
  - agency_artifacts: SELECT, INSERT
  - agency_events_id_seq: USAGE, SELECT
  - Revoca ALL de anon y authenticated en tablas y secuencia
- NO aplicada al proyecto remoto vnzyecnbdqbfuxawzrda (historial remoto termina en 20261025222020)
- Issue #260 (lectura remota directa, 2026-11-02) confirma: service_role SIN privilegio SELECT en las 6 tablas de agency
- RPC functions agency_claim_task, agency_heartbeat, agency_finish_task tienen EXECUTE para service_role en migración local 20261007000000, pero su estado remoto no está verificado
- Requiere aplicación remota vía supabase db push (necesita credenciales de Supabase y autorización de Don Martín)
- Bloquea T-20, T-21 (scheduler recurrente), T-22 (Owner Console)

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
- Archivo fuente: supabase/functions/nuva-agency-worker-control/worker-claims.ts
- Edge Function remota aún en v16 (valida solo issuer, repository, run_id, agent_id)

### Endurecimiento agrega estas validaciones OIDC (versión local vs remota v16):

| Claim | Local (hardened) | Remoto v16 | Estado |
|---|---|---|---|
| issuer | https://token.actions.githubusercontent.com | ✅ Validado | OK |
| audience | "nuva-one-agency" (AGENCY_WORKER_AUDIENCE) | ❌ No validado | FALTA |
| repository | "martinaburtoe-art/nuva-one" | ✅ Validado | OK |
| repository_owner | "martinaburtoe-art" | ❌ No validado | FALTA |
| run_id | Coincide con header x-agency-run-id, formato numeric >0 | ✅ Validado | OK |
| ref | "refs/heads/main" | ❌ No validado | FALTA |
| workflow_ref | "martinaburtoe-art/nuva-one/.github/workflows/nuva-agent-durable-worker.yml@refs/heads/main" | ❌ No validado | FALTA |
| job_workflow_ref | Igual a workflow_ref o undefined | ❌ No validado | FALTA |
| actor | "martinaburtoe-art" (solo owner) | ❌ No validado | FALTA |
| event_name | schedule, workflow_dispatch, push (solo estos) | ❌ No validado | FALTA |
| agent_id | Uno de los 13 especialistas autorizados | ✅ Validado | OK |

- T-32 (despliegue de la Edge Function endurecida) requiere autorización explícita de Don Martín
- No se puede desplegar Edge Function sin autorización de producción

## B-008: Migración de grants remotos no aplicada (T-20) — BLOQUEADO (sin autorización de BD remota)
- Migración 20261030130000_agency_service_role_privileges.sql preparada localmente (commit a3fa219d)
- No aplicada al proyecto remoto vnzyecnbdqbfuxawzrda
- Requiere aplicación remota vía supabase db push (necesita credenciales de Supabase y autorización)
- Bloquea T-21 (scheduler recurrente) y T-22 (Owner Console)
