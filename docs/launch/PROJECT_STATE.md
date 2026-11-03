# PROJECT_STATE — Estado actual del proyecto Nüva One

Generado durante SPRINT 0 — TAKEOVER. Fecha: 2026-11-03.

## Repositorio

- **Remoto:** https://github.com/martinaburtoe-art/nuva-one
- **Directorio local:** C:\Users\marti\Documents\nuva-one
- **Rama actual:** fix/reproducible-npm-ci-20261027 (@ cd8a4cea)
- **Rama main local:** 74202ea5 (88 commits detrás de origin/main)
- **origin/main:** 939365b3
- **Último commit local:** cd8a4cea — fix(agency): people emite evidencia PII scan y worker pasa AbortSignal al especialista

## Archivos sin seguir (untracked)

artifacts/overnight/, bun.lock.backup, package.json.bak, scripts/__pycache__/,
supabase/.temp/, test-results/, tests/__pycache__/, tsconfig.json.bak, vite.config.ts.bak

## Stack

React + TypeScript, Vite, TanStack Router, Tailwind CSS, Supabase, PostgreSQL, GitHub Actions, Vercel.

## Servicios

- **Vercel:** proyecto nuva-one, organización team_SX9pUgbdxVl9MoaMMoTVDbue, producción https://nuva-one.vercel.app/
- **Supabase:** proyecto vnzyecnbdqbfuxawzrda, nombre Nüva One, región us-east-2, B-002 resuelto (service_role con permisos en tablas agency_*)
- **GitHub:** 37 workflows activos, incluyendo Nüva Agency workers, CI, PR reviewer, safety gate, etc.

## PR abiertos relevantes (SPRINT 0)

| PR | Título | Rama | Estado | Mergeable | Checks |
|---|---|---|---|---|---|
| #269 | feat: subir trabajo pendiente de Nüva Agency (B-003) | fix/reproducible-npm-ci-20261027 | OPEN | MERGEABLE | CI en ejecución (5 checks) |
| #270 | fix(agency): restore durable specialist execution | fix/agency-durable-specialist-dispatch-20261103 | OPEN | MERGEABLE | 1 FAIL (lint/typecheck/test/audit/build) |
| #263 | fix(agency): surface durable mission query failures | fix/agency-worker-query-errors-20261102 | OPEN | MERGEABLE | ✅ Todos PASS |
| #266 | fix(agency): skip draft PRs in autonomous merge controller | fix/agency-merge-exclude-drafts-20261102 | OPEN | MERGEABLE | ✅ Todos PASS |
| #271 | fix(agency): dispatch durable specialists through registered functions | fix/agency-default-specialist-dispatch-20261103 | DRAFT | — | — |
| #272 | fix(agency): refresh OIDC tokens for durable worker heartbeats and finish | fix/agency-worker-oidc-refresh-20261103 | DRAFT | — | — |

## B-002 (Supabase) — RESUELTO

- agency-persist-supabase.mjs verificado: available: true
- Permisos de service_role otorgados en agency_missions, agency_tasks, agency_events, agency_agent_leases, agency_approvals, agency_artifacts
- Ciclo persistCycle → persistExecution → finalizeMission: 7/7 pasos OK
- Queda pendiente: worker duradero vía HTTP requiere GITHUB_RUN_ID real de GitHub Actions

## Archivos de Agency en scripts/

agency-cycle-logger.mjs, agency-durable-worker.mjs, agency-mission.mjs,
agency-persist-supabase.mjs, agency-run-specialist.mjs, agency-scheduler.mjs,
agency-select-next-task.mjs, agency-task-executor.mjs,
nuva-agency-certify.mjs, nuva-agency-correlate.mjs, nuva-agency-gateway-check.mjs,
nuva-agency-persist-incidents.mjs, nuva-agency-sentinel.mjs, nuva-agency-web-qa.mjs
