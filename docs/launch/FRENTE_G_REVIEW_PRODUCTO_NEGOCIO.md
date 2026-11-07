# Frente G — Producto y Negocio: Integración Nüva Agency ↔ Nüva One

**Repositorio:** C:\Users\marti\Documents\nuva-one (origin: martinaburtoe-art/nuva-one)
**Producción:** https://nuva-one.vercel.app/ | **Supabase:** vnzyecnbdqbfuxawzrda (us-east-2, ACTIVE_HEALTHY)
**Fecha de revisión:** 2026-11-04 | **Estado de la rama de trabajo:** fix/reproducible-npm-ci-20261027 (@ cd8a4cea), main 88 commits detrás de origin/main (939365b3)

Este reporte cubre los 5 entregables del Frente G: (1) análisis de integración agencia-producto, (2) prioridades de lanzamiento, (3) checklist financiero/tributario Chile (SII/TAX_CHILE), (4) indicadores de negocio verificables y (5) mejoras implementables con evidencia. Toda afirmación está anclada a archivos, commits, tests o comandos ejecutados del repositorio; nada es una idea sin respaldo.

---

## 0. Resumen ejecutivo

Nüva Agency está **implementada y certificada localmente**: 13 especialistas en `src/lib/agency/specialists.ts`, suite `429/429 PASS` (vitest), `lint exit 0`, `typecheck exit 0`, `npm run agency:certify PASS`, 15 PRs MERGEABLE/CLEAN (#263, #266, #269 con CI 8/8 verdes). El ciclo de autónomo INSPECT→PRIORITIZE→ASSIGN→EXECUTE→VERIFY→RECORD→LEARN→NEXT TASK está operativo (evidenciado en `docs/launch/AGENCY_OPERATIONS_BOARD.md` y `AGENCY_EVIDENCE_LOG.md`).

**Sin embargo, la integración no es duradera aún:** la persistencia en Supabase remoto está bloqueada (T-20: migración de grants `20261030130000_agency_service_role_privileges.sql` no aplicada; `service_role` sin privilegios en tablas `agency_*`), el worker duradero no puede reclamar/rematar tareas remotas (T-21), la sesión real de Owner Console no está disponible (T-22) y el endurecimiento OIDC del Edge Function `nuva-agency-worker-control v16` existe localmente (commit `e28f67e`, 14/14 PASS) pero no está desplegado remotamente (T-32). Todo lo anterior requiere **autorización explícita del owner** (no es reversible sin ella).

Producto: green en CI local, tests de carga 10→100 VU pasados (1.850/1.850 requests, p95 366 ms, p99 547 ms, sin oversell de inventario), pero Vercel rechaza el despliegue por `build-rate-limit` (límite de plataforma, no fallo del repo) y Supabase Auth requiere `password_hibp_enabled` a nivel de hosting (no hay herramienta expuesta para configurarlo desde el repo — véase `docs/BETA_READINESS_RUNBOOK.md`).

---

## 1. Análisis de integración agencia-producto

### 1.1 ¿Qué está integrado y cómo

| Componente | Archivo / evidencia | Estado |
|---|---|---|
| 13 especialistas de agencia | `src/lib/agency/specialists.ts` (Constructor, Orchestrator, Finance, Sales, Supply, People, Compliance, Growth, Security, QA, Sentinel, UX, Release) | Certificados PASS (`npm run agency:certify`) |
| Tablero de operaciones | `docs/launch/AGENCY_OPERATIONS_BOARD.md` (actualizado 2026-11-04) | 13 especialistas COMPLETED esta sesión |
| Matriz de capacidades reales | `docs/launch/AGENCY_EXECUTION_MATRIX.md` | GitHub ACTIVO; Vercel ACTIVO/PARCIAL; Supabase PARCIAL; Slack/Odoo NO DISPONIBLE |
| Backlog de tareas | `docs/nuva-agency/AGENT_BACKLOG.md` | T-tasks con dependencias, prioridad P0-P3, estados |
| Ejecutor de tareas | `scripts/agency-task-executor.mjs` (28,764 bytes, sintaxis OK verificada) | Operativo localmente |
| Worker duradero | `scripts/agency-durable-worker.mjs` + supervisor (PID 17464, `proc_f6db476e7896`) | Activo localmente; recuperación de heartbeat probada (T-120) |
| Plan de control Supabase | migración con tablas `agency_tasks`, `agency_missions`, `agency_events`, `agency_agent_leases`, `agency_approvals`, `agency_artifacts`; RLS habilitado; funciones `SECURITY DEFINER` con grant execute a `service_role` | Preparada localmente; grants no aplicados remoto (bloqueo T-20) |
| Edge Functions remotas | 6 ACTIVE: owner-metrics v19, owner-create-complimentary-account v17, owner-operational-metrics v19, nuva-telegram-agency v23, nuva-agency-ai-broker v14, nuva-agency-worker-control v16 | v16 desplegada; hardening OIDC commit `e28f67e` NO desplegado remoto (T-32) |
| Owner Console | `src/routes/owner/...` (`control-tower.tsx` 54 KB, `agency-status.ts` 18 KB legibles) | Listo; sesión real bloqueada (T-22) |
| CI / PRs | 37 workflows GitHub Actions; #263/#266/#269 MERGEABLE CI 8/8; #270 1 FAIL; #271/#272 DRAFT; 2 PRs conflictivos (#247, #236) | Pendiente de merge autorizado |

**Integraciones reales verificadas con llamada directa (evidencia en `AGENCY_EVIDENCE_LOG.md`):**
- GitHub: `gh repo view`, `gh pr list` (20+ PRs), `gh issue view 260` — ACTIVO como `martinaburtoe-art`.
- Vercel: `vercel whoami`, `vercel projects list` (3 proyectos), `vercel ls nuva-one` (múltiplos despliegues Ready, 2 producción hace 11h) — ACTIVO.
- Supabase: `supabase projects list` (2 proyectos), `supabase functions list` (6 funciones) — lectura PARCIAL; `supabase db query` falla remoto (CLI sin Docker, flags incompatibles, `localhost:54322` sin Docker local).
- Google OAuth OK (`martinaburtoe@gmail.com`, briefing 10:30), Telegram bot `@marti_manoderecha_bot` activo.
- Slack: NO conectado (`manage_connections` false). Odoo: NO hay conector en el catálogo.

### 1.2 Bloqueos operativos de la integración (evidencia directa)

| ID | Bloqueo | Especialista | Qué se necesita | Impacto |
|---|---|---|---|---|
| T-20 | Migración de grants remotos no aplicada; `service_role` sin privilegios en tablas `agency_*` | Release / Security | Autorización del owner + credenciales Supabase remoto | La agencia no puede persistir misiones/tareas duraderas en Supabase remoto; el tablero vive solo en Git |
| T-21 | Scheduler duradero (worker) no puede claim/finish remoto | Release | Depende de T-20 y T-32 | Sin worker duradero remoto, la agencia no ejecuta ciclos autónomos en producción |
| T-22 | Owner Console sesión real no disponible | Release | Depende de T-20, T-21 + sesión real del owner | Sin consola operativa real para el dueño del negocio |
| T-27 | Tarea real de Constructor en rama aislada | Constructor | Depende de worker duradero operativo | Sin T-27/T-28 no hay ciclo cierre: construir → validar en preview |
| T-32 | Hardening OIDC no desplegado en Edge Function remota | Security | Autorización de deploy del owner | Edge v16 en remoto sin hardening verificado (riesgo de auth/tokens del worker) |
| T-40 / T-49 / T-50 | Ciclo autónomo, sincronización de backlog, retrospectiva | Orchestrator | Dependen de T-31/T-40 desbloqueadas | Operación productiva de la agencia no retrospectable ni sincronizada |

### 1.3 Veredicto de integración

La agencia está **funcionalmente integrada con el producto** (código, tests, CI, PRs, backlog, tablero, consola de owner, Edge Functions) pero **no operativamente duradera**: sin la autorización del owner para T-20 (grants remotos) y T-32 (deploy OIDC), la agencia no puede escribir en Supabase remoto ni desplegar el worker endurecido. Todo lo demás (construcción de tareas, pruebas, lint, typecheck, certificación, monitoreo de despliegues) está verde y verificable.

Evidencia clave: `docs/launch/AGENCY_EVIDENCE_LOG.md` (entradas 1-69 + intentos fallidos F1-F5), `docs/launch/AGENCY_OPERATIONS_BOARD.md`, `docs/launch/PROJECT_STATE.md`, commit `cd8a4cea` (people PII scan + AbortSignal al especialista), commit `e28f67e` (OIDC hardening 14/14), tests `429/429 PASS`, `lint exit 0`, `tsc --noEmit exit 0`.
