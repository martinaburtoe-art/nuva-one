# INVENTARIO DE SINCRONIZACIÓN — Nüva One

**Fecha:** 2026-11-04  
**Repositorio:** martinaburtoe-art/nuva-one  
**Rama de trabajo:** `fix/reproducible-npm-ci-20261027` (local: `4bf0d5b8`, origin/main: `939365b3`)  
**GitHub autenticado:** `martinaburtoe-art` (keyring, scopes repo/workflow)  
**Supabase:** `vnzyecnbdqbfuxawzrda` (ACTIVE_HEALTHY, CLI no logueado — sin migraciones remotas)  
**Vercel:** `https://nuva-one.vercel.app/` (producción, 2 deploys previos — sin deploy productivo sin autorización)

---

## ESTADO GENERAL POR ARCHIVO

| # | Ruta | Tipo | Cambio | Destino | Estado | Evidencia |
|---|------|------|--------|---------|--------|-----------|
| 1 | `docs/launch/AGENCY_EVIDENCE_LOG.md` | Modificado | +entradas #91-#96 (T-33 a T-37) | GitHub | LOCAL → RESPALDAR | `git diff --stat` |
| 2 | `docs/launch/AGENCY_OPERATIONS_BOARD.md` | Modificado | tablero de operaciones | GitHub | LOCAL → RESPALDAR | `git diff --stat` |
| 3 | `docs/nuva-agency/AGENT_BACKLOG.md` | Modificado | +1122 líneas (backlog agencia) | GitHub | LOCAL → RESPALDAR | `git diff --stat` |
| 4 | `logs/cycles/index.json` | Modificado | índice de ciclos del supervisor | GitHub | LOCAL → RESPALDAR | `git diff --stat` |
| 5 | `scripts/agency-task-executor.mjs` | Modificado | +42 líneas (executor 13 especialistas) | GitHub | LOCAL → RESPALDAR | `git diff --stat` |
| 6 | `src/routes/api/billing/subscribe/register.ts` | Modificado | plan y precio server-side (Starter/Pro) | GitHub | LOCAL → RESPALDAR | `git diff --stat` |
| 7 | `src/routes/api/billing/subscribe/run-charges.ts` | Modificado | cobro recurrente idempotente (T-34) | GitHub | LOCAL → RESPALDAR | `git diff --stat` |
| 8 | `src/routes/checkout.tsx` | Modificado | envía `plan.id` y `billing` al registro | GitHub | LOCAL → RESPALDAR | `git diff --stat` |
| 9 | `docs/launch/ARQUITECTURA_PAGOS.md` | Nuevo | arquitectura de pagos T-34 | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 10 | `docs/launch/EXPEDIENTE_T20_GRANTS_REMOTOS.md` | Nuevo | expediente autorización T-20 | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 11 | `docs/launch/EXPEDIENTE_T32_DEPLOY_EDGE_FUNCTIONS.md` | Nuevo | expediente autorización T-32 | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 12 | `docs/launch/MATRIZ_LANZAMIENTO_INTEGRAL.md` | Nuevo | matriz de lanzamiento | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 13 | `docs/nuva-agency/T-134-INVESTIGACION-BLOQUEOS.md` | Nuevo | bloqueos T-20/T-21/T-22/T-27/T-28/T-32 | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 14 | `scripts/agency-generate-tasks.mjs` | Nuevo | generador continuo de tareas | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 15 | `scripts/agency-supervisor.mjs` | Nuevo | supervisor duradero (24 ciclos) | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 16 | `src/lib/fiscal/contratacion-integral.test.ts` | Nuevo | prueba integración suscripción (T-35) | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 17 | `src/lib/fiscal/mercadopago-webhook-signature.test.ts` | Nuevo | prueba firma webhook Mercado Pago (T-35) | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 18 | `artifacts/overnight/00-inventory.md` | Nuevo | inventario fase cero | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 19 | `artifacts/overnight/01-specialists-certification.md` | Nuevo | certificación 13 especialistas | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 20 | `artifacts/overnight/02-qa-final.md` | Nuevo | QA final | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 21 | `artifacts/overnight/03-launch-readiness.md` | Nuevo | readiness pre-lanzamiento | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 22 | `artifacts/overnight/04-security-audit.md` | Nuevo | auditoría de seguridad | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 23 | `artifacts/overnight/05-durable-worker.md` | Nuevo | worker duradero | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 24 | `artifacts/overnight/06-scheduler-certification.md` | Nuevo | certificación scheduler | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 25 | `artifacts/overnight/07-owner-console.md` | Nuevo | Owner Console | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 26 | `artifacts/overnight/08-blockers.md` | Nuevo | bloqueos identificados | GitHub | LOCAL → RESPALDAR | archivo nuevo |
| 27 | `artifacts/overnight/09-executive-report.md` | Nuevo | informe ejecutivo | GitHub | LOCAL → RESPALDAR | archivo nuevo |

---

## ARCHIVOS TEMPORALES (NO SUBIR A GITHUB)

| Ruta | Motivo | Acción |
|------|--------|--------|
| `bun.lock.backup`, `package.json.bak`, `tsconfig.json.bak`, `vite.config.ts.bak` | Copias de seguridad locales de configuración | No subir; conservar localmente |
| `scripts/__pycache__/`, `tests/__pycache__/` | Caché de bytecode Python | No subir (regenerable) |
| `supabase/.temp/` | Estado temporal de Supabase CLI | No subir (regenerable con `supabase link`) |
| `test-results/`, `err.txt`, `out.txt` | Salida de pruebas y logs temporales | No subir |
| `artifacts/overnight/` (9 archivos) | Artefactos de inventario nocturno | **SÍ subir** (documentación de trabajo) |

---

## RAMAS Y PULL REQUESTS

| Rama | SHA local | SHA remoto | Estado | PR asociado |
|------|-----------|------------|--------|-------------|
| `fix/reproducible-npm-ci-20261027` | `4bf0d5b8` | no subida aún | LOCAL → SUBIR | PR #269 (OPEN, basado en esta rama) |
| `main` | — | `939365b3` | remoto sincronizado | — |

PRs abiertos relevantes (sin merge, sin acción): #269, #270, #271, #272, #248, #247, #231, #227, #222, y varios DRAFT.

---

## SUPABASE

| Elemento | Local | Remoto (`vnzyecnbdqbfuxawzrda`) | Estado | Acción |
|----------|-------|-------------------------------|--------|--------|
| Proyecto | vinculado | ACTIVE_HEALTHY | sincronizado | inspección solamente |
| Edge Functions | 7 locales | 6 desplegadas (`platform-telemetry` ausente) | DESFASE | documentar, no desplegar sin autorización |
| Migraciones | 51+ archivos locales | no aplicadas remoto (T-20 bloqueado) | PENDIENTE | expediente preparado, no ejecutar |
| CLI | v2.122.0 disponible | no logueado | — | no hacer `supabase login` sin autorización |

---

## VERCEL

| Elemento | Estado | Acción |
|----------|--------|--------|
| Proyecto vinculado | `https://nuva-one.vercel.app/` | verificar vinculación |
| Producción | 2 deploys (~11h previos) | no reemplazar ni promover sin autorización |
| Build | local exit 0 | preparar, no desplegar producción |

---

## CRITERIOS DE ESTADO

- **LOCAL**: solo en disco del usuario, no en remoto.
- **RESPALDADO**: commitado en rama local.
- **SINCRONIZADO**: push hecho a origin, disponible en GitHub.
- **DESPLEGADO**: en Vercel o Supabase remoto.
- **VALIDADO EN PRODUCCIÓN**: verificado contra entorno productivo real (no aplicable sin autorización).
