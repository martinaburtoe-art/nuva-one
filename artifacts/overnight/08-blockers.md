# 08-blockers.md — Bloqueos de Nüva Agency

**SHA certificado:** `6b8d5d97`
**Fecha:** 2026-10-31T04:45:00 (UTC-03)

## B-002 — Credenciales Supabase no configuradas (P1, abierto)

**Síntoma:** `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` no están en el entorno local.

**Bloquea:**
- Persistencia duradera en Supabase (`agency_missions`, `agency_tasks`, `agency_events`, `agency_agent_leases`, `agency_approvals`, `agency_artifacts`) — solo FS local en `logs/missions/`, `logs/executions/`, `logs/cycles/`.
- `agency-control`, `agency-execute`, `agency-status` (vista durable) requieren Supabase; solo `agency-logs` (FS local) opera sin Supabase.
- Worker duradero end-to-end (claim/lease/heartbeat/finish contra `/api/owner/agency-control`).
- Owner Console end-to-end (autenticación JWT + escritura en BD).
- pgTAP y pruebas de persistencia contra base real.

**Acción requerida del propietario:** configurar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del proyecto `vnzyecnbdqbfuxawzrda`. No aplicar migraciones remotas ni cambiar RLS sin autorización. No solicitar ni exponer claves por chat.

## B-001 (histórico, resuelto) — T-18 bloqueada → T-30 pendiente

**Estado:** Resuelto en parte: el executor batch procesa tareas elegibles; T-30 sigue bloqueada por T-18 (Constructor/UX sin comando shell-ejecutable; Owner Console requiere despliegue para acceso operativo). Queda como limitación conocida hasta que T-18 se desbloquee o se redefina.

## B-003 — 3 archivos sin confirmar (CRLF/LF)

**Estado:** 3 archivos con cambios de fin de línea (sin cambios de lógica) bloquean `git checkout main`. No son cambios de lógica y no se descartarán. Se dejan sin confirmar hasta que el propietario decida.

## Cambios no confirmados en working tree

`docs/nuva-agency/AGENT_BACKLOG.md`, `logs/cycles/index.json`, `scripts/agency-run-specialist.mjs`, `src/routeTree.gen.ts` (modificados); `artifacts/overnight/`, `bun.lock.backup`, `package.json.bak`, `scripts/__pycache__/`, `supabase/.temp/`, `test-results/`, `tests/__pycache__/`, `tsconfig.json.bak`, `vite.config.ts.bak` (sin rastrear). Ninguno es cambio de lógica del producto salvo los citados.

## Veredicto de bloqueo

El sistema es **NO LISTA PARA LANZAMIENTO** mientras persista B-002 (no hay persistencia duradera verificada en Supabase ni Owner Console operativo end-to-end). Está **LISTA PARA OPERACIÓN CONTROLADA** en entorno local: 13 especialistas, orquestación, misión real, scheduler, QA y seguridad verificados localmente.
