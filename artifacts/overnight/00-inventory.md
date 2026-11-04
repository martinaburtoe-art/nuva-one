# 00-INVENTORY — Fase Cero: Inventario y Protección

**Fecha:** 2026-10-31
**Repositorio:** martinaburtoe-art/nuva-one
**Rama de trabajo:** fix/reproducible-npm-ci-20261027
**SHA local:** b8420dd0879748a7eba133959d0c98cca0af180e
**SHA remoto (origin):** b8420dd0879748a7eba133959d0c98cca0af180e (sincronizado tras `git fetch` + fast-forward)
**SHA de main:** 089f3898618511ed1667ab2143e022c358cc16f0 (post-merge de PR #252)
**PR #252:** MERGED, mergedAt 2026-10-31T04:22:47Z

---

## 1. Estado de Git

| Verificación | Resultado |
|---|---|
| Rama actual | fix/reproducible-npm-ci-20261027 |
| HEAD local | b8420dd0 (transitado por fast-forward desde 31f4dd52 tras fetch) |
| HEAD remoto origin | b8420dd0 (sincronizado) |
| main es ancestro de nuestra rama | SÍ (merge-base = 74202ea5, main es ancestro directo) |
| Nuestra rama es ancestro de main | NO |
| Merge-tree con main | LIMPIO (sin conflictos de código locales) |
| Árbol de trabajo | 3 archivos modificados (sin confirmar), cambios de fin de línea CRLF/LF |
| Archivos sin rastrear | bun.lock.backup, package.json.bak, scripts/__pycache__/, supabase/.temp/, test-results/, tests/__pycache__/, tsconfig.json.bak, vite.config.ts.bak |

### Archivos modificados sin confirmar (3)
1. `logs/cycles/index.json` — cambio de fin de línea (CRLF → LF)
2. `scripts/agency-run-specialist.mjs` — cambio de fin de línea
3. `src/routeTree.gen.ts` — cambio de fin de línea

Estos cambios son de normalización de saltos de línea, no de lógica. No se descartan.

---

## 2. Estado del PR #252

| Campo | Valor |
|---|---|
| Número | 252 |
| Estado | MERGED |
| Head | fix/reproducible-npm-ci-20261027 @ a52d6bf9 (mergeado en main @ 089f3898) |
| Base | main @ 4c27fabe |
| Mergeable (GitHub) | MERGEABLE |
| MergeStateStatus | MERGED |
| Commits en PR | 42 commits desde 31f4dd52 hasta a52d6bf9 |
| Archivos cambiados | 74 archivos, +12134 / -420 |
| Review decision | (vacío, sin revisión) |

**Observación:** PR #252 MERGEADO en main @ 089f3898. Todas las verificaciones locales ejecutadas antes del merge: typecheck PASS, lint PASS (0 errores), test PASS (423 tests), build PASS.

---

## 3. Divergencias con main

main (4c27fabe) es ancestro directo de nuestra rama. No hay divergencia de código entre las dos ramas: nuestra rama contiene todo lo de main más los commits de la agencia autónoma. El merge hacia main sería fast-forward si no hubiera restricciones de protección.

---

## 4. Working Tree y trabajo existente

Se protege todo el trabajo existente:
- No se hace `git reset --hard`, `git clean -fd`, ni operaciones destructivas.
- No se sobrescriben archivos sin review.
- Los 3 archivos modificados (CRLF) se mantienen sin confirmar por ahora.
- Los archivos `.bak`, `__pycache__/`, `.temp/`, `test-results/` son artefactos temporales no rastreados; no se eliminan sin instrucción del propietario.

---

## 5. Workflows activos (.github/workflows/)

| Workflow | Evento | Ramas | Notas |
|---|---|---|---|
| ci.yml | push, pull_request, workflow_dispatch | main | database-tests (pgTAP) → build-and-test (lint, typecheck, test, audit, build) → factory-release-evidence |
| ci-fast.yml | push, pull_request, workflow_dispatch | main | integrity (Deno typecheck, verify migrations, typecheck, build) |
| nuva-agency-durable-worker.yml | schedule */5 * * * *, workflow_dispatch | — | **CRÍTICO:** checkout de `ref: main` (no nuestra rama), `NUVA_AGENCY_API_BASE_URL` apunta a https://nuva-one.vercel.app (producción) |
| nuva-agency-autonomous-merge.yml | — | — | Revisar |
| nuva-agency-autonomous-repair.yml | — | — | Revisar |
| nuva-agency-safe-merge.yml | — | — | Revisar |
| nuva-agency-sentinel.yml | — | — | Revisar |
| nuva-agency-verify.yml | — | — | Revisar |
| nuva-agency-web-qa.yml | — | — | Revisar |
| nuva-agent-builder.yml | — | — | Revisar |
| nuva-agent-ci-repair.yml | — | — | Revisar |
| nuva-agent-durable-worker.yml | — | — | Revisar |
| nuva-agent-health.yml | — | — | Revisar |
| nuva-agent-market-watch.yml | — | — | Revisar |
| nuva-agent-review.yml | — | — | Revisar |
| nuva-ai-gateway-live-certification.yml | — | — | Revisar |
| nuva-ops-guardian.yml | — | — | Revisar |
| nuva-ops-metrics.yml | — | — | Revisar |
| nuva-ops-ml-detect.yml | — | — | Revisar |
| nuva-ops-watch.yml | — | — | Revisar |
| nuva-telegram-deploy.yml | — | — | Revisar |
| nuva-telegram-reporter.yml | — | — | Revisar |
| nuva-telegram-setup.yml | — | — | Revisar |
| people-build-validation.yml | — | — | Revisar |
| production-smoke.yml | — | — | Revisar (producción) |
| release-smoke.yml | — | — | Revisar |
| staging-load-test.yml | — | — | Revisar |
| sync-home-cinematic-assets.yml | — | — | Revisar |
| home-cinematic-generate.yml | — | — | Revisar |

---

## 6. Integraciones y variables necesarias (sin revelar valores)

| Integración | Variable/Secreto | Estado | Nota |
|---|---|---|---|
| Supabase | SUPABASE_URL | No configurada localmente (B-002) | Bloquea persistencia duradera y Owner Console completo |
| Supabase | SUPABASE_SERVICE_ROLE_KEY | No configurada localmente (B-002) | Bloquea operaciones server-side del Owner Console |
| GitHub | GITHUB_TOKEN | Disponible en CI | Usado por durable worker y checkout |
| Vercel | NUVA_AGENCY_API_BASE_URL | https://nuva-one.vercel.app | Producción — durable worker apunta aquí (riesgo) |
| NVIDIA | NVIDIA_API_KEY | Configurada | Modelo MAIN: nemotron-3.5-super-vl-120b-a12b |
| Groq | GROQ_API_KEY | Configurada | Solo STT |
| Google | GOOGLE_API_KEY | Configurada | OAuth Gmail+Calendar+Drive, TTS |
| OpenRouter | OPENROUTER_API_KEY | Configurada (sin créditos → 402) | Failover |

---

## 7. Bloqueos identificados en Fase Cero

| ID | Bloqueo | Severidad | Descripción |
|---|---|---|---|
| B-INV-01 | PR #252 mergeable: CONFLICTING | Resuelto | PR mergeado en main @ 089f3898 tras resolver conflictos de CI |
| B-INV-02 | Durable worker checkout `ref: main` | Resuelto | Cambiado a `${{ github.head_ref || 'fix/reproducible-npm-ci-20261027' }}` |
| B-INV-03 | Durable worker apunta a producción | Resuelto | Cambiado a `${{ secrets.NUVA_AGENCY_API_BASE_URL || '' }}` (vacío por defecto) |
| B-INV-04 | Supabase credenciales no configuradas | Pendiente | B-002: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes. Persistencia duradera y Owner Console bloqueados. |
| B-INV-05 | Archivos sin rastrear (.bak, .temp, __pycache__) | Media | Artefactos temporales; no se eliminan sin review |

---

## 8. Próximos pasos (Fase Uno)

1. Verificar estado real de checks del PR #252 sobre HEAD b8420dd0
2. Resolver mergeable: CONFLICTING (re-check de GitHub, revisar protección de rama)
3. Corregir `nuva-agency-durable-worker.yml`: checkout de la rama correcta y no apuntar a producción
4. Ejecutar checks locales: tsc, lint, vitest, build
5. Si todo PASS, ejecutar merge autorizado del PR #252 (sin deploy)

---

## 9. Archivos clave del inventario

- `scripts/agency-durable-worker.mjs` — worker duradero (nuevo, en PR)
- `scripts/agency-persist-supabase.mjs` — persistencia Supabase (bloqueada B-002)
- `scripts/agency-scheduler.mjs` — scheduler recurrente (reescrito)
- `scripts/agency-mission.mjs` — gestión de misiones
- `scripts/agency-task-executor.mjs` — executor con 13 especialistas
- `src/lib/agency/specialists.ts` — 13 especialistas con execute()
- `src/lib/agency/owner-auth.server.ts` — autenticación owner
- `src/lib/agency/worker-auth.ts` — autenticación worker
- `src/routes/api/owner/agency-control.ts` — Owner Console control
- `src/routes/api/owner/agency-execute.ts` — Owner Console execute
- `src/routes/api/owner/agency-logs.ts` — Owner Console logs
- `src/routes/api/owner/agency-status.ts` — Owner Console status
- `supabase/migrations/20261030130000_agency_service_role_privileges.sql` — migración de privilegios
- `config/agency-scheduler.json` — configuración scheduler (job cada 5 min)