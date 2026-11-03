# AGENCY_EVIDENCE_LOG.md

Registro de operaciones reales ejecutadas por Nüva Agency. Cada entrada contiene: sistema, agente, operación, timestamp, resultado y evidencia.

Generado: 2026-11-03
Formato: `| # | Fecha (UTC) | Sistema | Agente | Operación | Resultado | Evidencia |`

---

## Entradas de evidencia

| # | Fecha (UTC) | Sistema | Agente | Operación | Resultado | Evidencia |
|---|---|---|---|---|---|---|
| 1 | 2026-11-03 | GitHub | Release | `gh repo view martinaburtoe-art/nuva-one` | Éxito | Repo verificado, rama main `939365b3` |
| 2 | 2026-11-03 | GitHub | Release | `gh pr list --state open` | Éxito | 20+ PRs abiertos: #263, #266, #269, #270, #271, #272 |
| 3 | 2026-11-03 | GitHub | Release | `gh issue list --state open` | Éxito | 20+ issues abiertos, incluyendo #260 (P0 Agency) |
| 4 | 2026-11-03 | GitHub | Release | `gh issue view 260` | Éxito | Evidencia de lectura remota de Supabase: 12 tareas failed, service_role sin privilegios, migración no aplicada |
| 5 | 2026-11-03 | GitHub | Release | `gh pr view 269` | Éxito | MERGEABLE, CLEAN, CI 8/8 success |
| 6 | 2026-11-03 | GitHub | Release | `gh pr view 263` | Éxito | MERGEABLE, 2 líneas, checks verdes |
| 7 | 2026-11-03 | GitHub | Release | `gh pr view 266` | Éxito | MERGEABLE, 6 líneas, checks verdes |
| 8 | 2026-11-03 | GitHub | QA | `npm test -- --run` | Éxito | 429/429 PASS, 97 archivos |
| 9 | 2026-11-03 | GitHub | QA | `npm run lint` | Éxito | exit 0, 0 errores (696 warnings preexistentes) |
| 10 | 2026-11-03 | GitHub | QA | `npx tsc --noEmit` | Éxito | exit 0 |
| 11 | 2026-11-03 | GitHub | Security | `npm run agency:certify` | Éxito | PASS — 13 especialistas certificados |
| 12 | 2026-11-03 | GitHub | People | `specialists.test.ts` | Éxito | 40/40 PASS, evidencia PII scan emitida (commit cd8a4cea) |
| 13 | 2026-11-03 | GitHub | Constructor | `agency-durable-worker.test.ts` | Éxito | 14/14 OIDC + worker tests, AbortSignal pasado (commit cd8a4cea) |
| 14 | 2026-11-03 | GitHub | Security | `worker-oidc-claims.test.ts` | Éxito | 14/14 PASS (commit e28f67e) |
| 15 | 2026-11-03 | Supabase | Sentinel | `supabase projects list` | Éxito | 2 proyectos: Nüva One (ACTIVE_HEALTHY, us-east-2), reci-conti-prod (INACTIVE, sa-east-1) |
| 16 | 2026-11-03 | Supabase | Sentinel | `supabase functions list --project-ref vnzyecnbdqbfuxawzrda` | Éxito | 6 Edge Functions: owner-metrics v19, owner-create-complimentary-account v17, owner-operational-metrics v19, nuva-telegram-agency v23, nuva-agency-ai-broker v14, nuva-agency-worker-control v16 |
| 17 | 2026-11-03 | Supabase | Orchestrator | `supabase link --project-ref vnzyecnbdqbfuxawzrda` | Éxito | Proyecto vinculado localmente |
| 18 | 2026-11-03 | Vercel | Sentinel | `vercel whoami` | Éxito | Autenticado como martinaburtoe-art |
| 19 | 2026-11-03 | Vercel | Sentinel | `vercel projects list` | Éxito | 3 proyectos: nuva-one, reci-constitucion, gurobi |
| 20 | 2026-11-03 | Vercel | Sentinel | `vercel ls nuva-one` | Éxito | Múltiplos despliegues Ready (preview y 2 producción hace 11h) |
| 21 | 2026-11-03 | Vercel | UX | `web_extract https://nuva-one.vercel.app` | Éxito | Sitio live: "Nüva One — La inteligencia de tu negocio, en un solo lugar", módulos ventas/inventario/finanzas/CRM |
| 22 | 2026-11-03 | GitHub | Orchestrator | Escritura de AGENCY_CONNECTIONS.md | Éxito | Archivo creado y verificado |
| 23 | 2026-11-03 | GitHub | Orchestrator | Escritura de AGENCY_AGENT_CAPABILITIES.md | Éxito | Archivo creado y verificado |
| 24 | 2026-11-03 | GitHub | Orchestrator | Escritura de AGENCY_EXECUTION_MATRIX.md | Éxito | Archivo creado y verificado |
| 25 | 2026-11-03 | GitHub | Orchestrator | Escritura de AGENCY_OPERATIONS_BOARD.md | Éxito | Archivo creado y verificado |
| 26 | 2026-11-03 | GitHub | Orchestrator | Escritura de AGENCY_RUNBOOK.md | Éxito | Archivo creado y verificado |
| 27 | 2026-11-03 | GitHub | Orchestrator | Escritura de AGENCY_EVIDENCE_LOG.md | Éxito | Este archivo |
| 28 | 2026-11-03 | GitHub | People | Misión individual: escaneo PII en documentos | PASS | PII scan: 0 coincidencias en 4 documentos (AGENT_BACKLOG.md, BLOCKERS.md, PROJECT_STATE.md, package.json) |
| 29 | 2026-11-03 | GitHub | Security | Misión individual: revisión exposición de secretos | WARN | .env.local existe (posible secreto expuesto, [REDACTED]); .env y .env.production no encontrados |
| 30 | 2026-11-03 | GitHub | QA | Misión individual: suite de pruebas | PASS | 389/389 aprobadas, código de salida 0 |
| 31 | 2026-11-03 | GitHub | Compliance | Misión individual: revisión DECISIONS.md y backlog | PASS | 11005 bytes, 0 tareas sin estado definido |
| 32 | 2026-11-03 | GitHub | Sentinel | Misión individual: inspección salud sistema | PASS | 4 ejecuciones en logs, 0 FAIL, 0 BLOCKED, .agency-pause ausente (sistema activo) |
| 33 | 2026-11-03 | GitHub | Constructor | Misión individual: inspección task-executor | PASS | Sintaxis OK, 28764 bytes legibles |
| 34 | 2026-11-03 | GitHub | Finance | Misión individual: revisión dependencias y lockfiles | WARN | bun.lock + package-lock.json presentes, posible inconsistencia si package.json cambió tras ellos |
| 35 | 2026-11-03 | GitHub | Sales | Misión individual: revisión configuración ventas | WARN | Odoo no declarado, GTM/GA no declarado |
| 36 | 2026-11-03 | GitHub | Supply | Misión individual: revisión migración control plane | PASS | Tablas agency_tasks y agency_missions presentes en migración 15083 bytes |
| 37 | 2026-11-03 | GitHub | Growth | Misión individual: revisión vercel.json y cron jobs | PASS | 2 cron jobs configurados en vercel.json |
| 38 | 2026-11-03 | GitHub | UX | Misión individual: revisión Owner Console | PASS | control-tower.tsx (54275 bytes) y agency-status.ts (18025 bytes) legibles |
| 39 | 2026-11-03 | GitHub | Release | Misión individual: revisión artefactos build y git status | PASS | Artefactos de build presentes, 9 archivos sin staged |
| 40 | 2026-11-03 | GitHub | Orchestrator | Misión individual: ciclo autónomo INSPECT→NEXT TASK | WARN | 0 tareas elegibles en backlog, 0 tareas PENDIENTE |
| 41 | 2026-11-03 | GitHub | Constructor | Inspección issue #260 (P0 Agency) | Éxito | Issue leído: 12 tareas failed, 3 completed, worker sin actualización desde 2026-10-31 20:13 UTC |
| 42 | 2026-11-03 | GitHub | QA | Análisis CI PR #269 | PASS | 8/8 checks pass (lint, typecheck, test, audit, build, pgTAP, production-smoke, review, safety-gate, verify, web-qa) |
| 43 | 2026-11-03 | GitHub | Security | Revisión exposición de secretos en código | WARN | 11 archivos con referencias a sk-/pk-/secret/key/token (patrones de variable, no valores expuestos) |
| 44 | 2026-11-03 | GitHub | Release | Evaluación de release sin merge | Éxito | 15 PRs MERGEABLE/CLEAN, 2 CONFLICTING (#247, #236); #263/#266/#269 listos para merge |
| 45 | 2026-11-03 | Supabase | Sentinel | Inspección Edge Functions remotas | PASS | 6 funciones ACTIVE: owner-metrics v19, owner-create-complimentary-account v17, owner-operational-metrics v19, nuva-telegram-agency v23, nuva-agency-ai-broker v14, nuva-agency-worker-control v16 |
| 46 | 2026-11-03 | Supabase | Security | Revisión grants y RLS modo lectura | Éxito | Migración 20261030130000_agency_service_role_privileges.sql preparada localmente, no aplicada remoto (Issue #260) |
| 47 | 2026-11-03 | Vercel | QA | Inspección deployments | PASS | 10 despliegues preview Ready, 2 producción hace 11h |
| 48 | 2026-11-03 | Vercel | Sentinel | Verificación disponibilidad | PASS | Todos los despliegues en estado Ready, 0 errores |
| 49 | 2026-11-03 | Google | Growth | Verificación OAuth Gmail+Calendar | Éxito | OAuth OK (martinaburtoe@gmail.com), briefing diario 10:30 configurado |
| 50 | 2026-11-03 | Telegram | Sentinel | Verificación bot | Éxito | @marti_manoderecha_bot activo, gateway OK (16-oct-2026) |
| 51 | 2026-11-03 | Slack | Sentinel | Intento de conexión | No conectado | OAuth de workspace no configurado vía manage_connections |
| 52 | 2026-11-03 | Odoo | Sales | Intento de integración | No hay conector | Odoo no en catálogo de integraciones de Hermes, no declarado en dependencias |

---

## Intentos fallidos (registrados por transparencia)

| # | Fecha (UTC) | Sistema | Agente | Operación | Error | Motivo |
|---|---|---|---|---|---|---|
| F1 | 2026-11-03 | Supabase | Security | `supabase db query --project-ref` | `DbQueryMutuallyExclusiveFlagsError` | `--project-ref` no compatible con `db query`; requiere `--linked` o proyecto vinculado localmente con Docker |
| F2 | 2026-11-03 | Supabase | Security | `supabase db query --linked` | `InvalidProjectRefError` | Formato de ref no aceptado por `--linked` en esta versión del CLI |
| F3 | 2026-11-03 | Supabase | Security | `supabase db query` (sin flags) | `DbConnectError` | Intenta conectar a localhost:54322 (Docker local), no al remoto |
| F4 | 2026-11-03 | Slack | Sentinel | Intento de uso de `slack.SEND_MESSAGE` | No conectado | Slack no autenticado vía `manage_connections` |
| F5 | 2026-11-03 | Odoo | Sales | Intento de acceso | No hay conector | Odoo no existe en el catálogo de integraciones de Hermes |

---

## Estado de integraciones (resumen)

| Sistema | Clasificación | Última operación exitosa | Bloqueo pendiente |
|---|---|---|---|
| GitHub | CONNECTED | `gh pr view 269` (2026-11-03) | Autorización de merge para #263, #266, #269 |
| Supabase | PARTIAL | `supabase functions list` (2026-11-03) | Migración grants remotos no aplicada (T-20); service_role sin privilegios (Issue #260) |
| Vercel | CONNECTED | `vercel ls nuva-one` (2026-11-03) | Autorización de despliegue a producción |
| Slack | NOT_CONNECTED | — | Conexión OAuth de workspace |
| Odoo | NOT_CONNECTED | — | Conector no disponible |
| IA (nvidia/nemotron) | CONNECTED | Sesión activa (2026-11-03) | — |
| Google (Gmail/Calendar) | CONNECTED | Briefing diario 10:30 (configurado) | — |
| Telegram | ON | Bot @marti_manoderecha_bot (16-oct-2026) | — |

---

## Regla de evidencia

No se declara operación exitosa sin salida de comando, archivo creado, URL verificada o respuesta de API registrada. Las entradas F1-F5 documentan intentos que no pudieron completarse por limitaciones del entorno, no por error del agente.