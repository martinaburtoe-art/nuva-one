# AGENCY_OPERATIONS_BOARD.md

Tablero persistente de Nüva Agency — estado de cada especialista, tarea actual, sistema utilizado, última actividad y siguiente tarea.

Generado: 2026-11-03
Actualizado: 2026-11-03 (sesión activa JARVIS)
Fuente: evidencia de ejecución real en esta sesión y estados previos verificados.

---

## Leyenda de estados

| Estado | Significado |
|---|---|
| IDLE | Disponible, sin tarea asignada |
| WORKING | Ejecutando tarea activa |
| BLOCKED | Tarea detenida por impedimento concreto (credenciales, autorización, dependencia) |
| ERROR | Última ejecución falló, requiere intervención |
| COMPLETED | Tarea finalizada con evidencia verificable |

---

## Estado actual de los 13 especialistas

| ID | Especialista | Estado | Tarea actual | Sistema utilizado | Última actividad | Siguiente tarea |
|---|---|---|---|---|---|---|
| 1 | Constructor | COMPLETED | Misión individual: inspección task-executor | GitHub, archivos locales | Sintaxis OK en agency-task-executor.mjs (28764 bytes); issue #260 inspeccionado | Implementar tarea acotada en rama aislada cuando se asigne (T-27) |
| 2 | Orchestrator | WORKING | Ciclo autónomo INSPECT→NEXT TASK | GitHub, Supabase, Vercel, archivos locales | 13 misiones individuales ejecutadas y verificadas; 0 tareas elegibles en backlog | Asignar próxima tarea desbloqueada; continuar ciclo autónomo |
| 3 | Finance | COMPLETED | Misión individual: revisión dependencias y lockfiles | Archivos locales | Modelo de costos infraestructura creado (AGENCY_FINANCE_COST_MODEL.md); WARN: lockfiles duplicados | Revisar punto de equilibrio con modelo de costos |
| 4 | Sales | COMPLETED | Misión individual: revisión configuración ventas | GitHub, archivos locales | Estrategia comercial SaaS B2B creada (AGENCY_SALES_STRATEGY.md); WARN: Odoo/GTM/GA no declarados | Ejecutar embudo de captación con primeros clientes piloto |
| 5 | Supply | COMPLETED | Misión individual: revisión migración control plane | GitHub, Supabase | Tablas agency_tasks y agency_missions verificadas en migración | Validar esquema de inventario local |
| 6 | People | COMPLETED | Misión individual: escaneo PII en documentos | GitHub, archivos locales | PII scan: 0 coincidencias en 4 documentos (commit cd8a4cea) | Escaneo PII en nuevos documentos |
| 7 | Compliance | COMPLETED | Misión individual: revisión DECISIONS.md y backlog | GitHub | 11005 bytes leído, 0 tareas sin estado definido | Auditar nuevos cambios antes de merge |
| 8 | Growth | COMPLETED | Misión individual: revisión vercel.json y cron jobs | GitHub, archivos locales | Plan de crecimiento creado (AGENCY_GROWTH_PLAN.md); 2 cron jobs verificados | Ejecutar plan de adquisición de clientes piloto |
| 9 | Security | COMPLETED | Misión individual: revisión exposición de secretos | GitHub, Supabase | OIDC hardening commit e28f67e (14/14 PASS); .env.local detectado como posible secreto | Verificar hardening OIDC en deploy remoto (pendiente autorización T-32) |
| 10 | QA | COMPLETED | Misión individual: suite de pruebas | GitHub | 389/389 PASS; CI PR #269 analizado (8/8 success) | Revalidar tras próximos cambios |
| 11 | Sentinel | COMPLETED | Misión individual: inspección salud Edge Functions | GitHub, Supabase, Vercel | 6 Edge Functions ACTIVE inspeccionadas; despliegues Vercel listados; Google/Telegram verificados | Monitoreo continuo de sistemas |
| 12 | UX | COMPLETED | Misión individual: revisión Owner Console | Vercel, archivos locales | control-tower.tsx y agency-status.ts legibles; homepage revisada | Revisar flujos de usuario en previews |
| 13 | Release | COMPLETED | Misión individual: revisión artefactos build y git status | GitHub, Vercel | PRs #263/#266/#269 MERGEABLE, CI 8/8 PASS; evaluación de release sin merge | Preparar merge y despliegue (pendiente autorización owner) |

---

## Tareas en curso y bloqueadas

### Tareas activas (WORKING)

| ID | Especialista | Tarea | Sistema | Bloqueo | Próximo paso |
|---|---|---|---|---|---|
| 2 | Orchestrator | Ciclo autónomo continuo | GitHub, Supabase, Vercel, archivos | Ninguno | Continuar con siguiente tarea desbloqueada |

### Tareas bloqueadas (BLOCKED)

| ID | Especialista | Tarea | Sistema | Bloqueo | Qué se necesita para desbloquear |
|---|---|---|---|---|---|
| T-20 | Release / Security | Aplicar migración de grants remotos | Supabase remoto | service_role sin privilegios en tablas agency; migración no en historial remoto | Autorización del owner para aplicar migración remota + credenciales de Supabase |
| T-21 | Release | Scheduler durable (worker) | Supabase, GitHub Actions | Depende de T-20 y T-32 | T-20 resuelto + T-32 desplegado |
| T-22 | Release | Owner Console (sesión real) | Supabase, Vercel | Depende de T-20 y T-21 | T-20 y T-21 resueltos + sesión real de owner |
| T-27 | Constructor | Implementar tarea real en rama aislada | GitHub | Depende de T-20/T-21 (worker capaz de claim/finish) | Worker durable operativo |
| T-28 | QA | Validar cambio real de constructor | GitHub, Vercel preview | Depende de T-27 | T-27 completado |
| T-32 | Security | Desplegar hardening OIDC en Edge Function | Supabase Edge Function | Edge v16 desplegada pero hardening no aplicado remoto | Autorización de deploy del owner |

### Tareas completadas (COMPLETED) — esta sesión

| ID | Especialista | Tarea | Sistema | Evidencia |
|---|---|---|---|---|
| — | People | Evidencia PII scan en especialista people | GitHub | `specialists.test.ts:83` satisfecho, 40/40 PASS, commit cd8a4cea |
| — | Constructor | Pasar AbortSignal a executeSpecialist | GitHub | `agency-durable-worker.test.ts:52` satisfecho, commit cd8a4cea |
| — | QA | Suite completa de pruebas | GitHub | 429/429 PASS, 97 archivos |
| — | QA | Lint y typecheck | GitHub | `npm run lint` exit 0, `npx tsc --noEmit` exit 0 |
| — | Security | Certificación de especialistas | GitHub | `npm run agency:certify` PASS |
| — | Release | Verificación CI PR #269 | GitHub | 8/8 success, MERGEABLE, CLEAN |
| — | Release | Revisión PR #263 | GitHub | MERGEABLE, 2 líneas, checks verdes |
| — | Release | Revisión PR #266 | GitHub | MERGEABLE, 6 líneas, checks verdes |
| — | Sentinel | Monitoreo de despliegues Vercel | Vercel | `vercel ls nuva-one` — múltiples despliegues Ready, 2 producción 11h |
| — | UX | Revisión de homepage | Vercel | https://nuva-one.vercel.app extraído y analizado |
| — | People | Misión individual: escaneo PII | GitHub | 0 coincidencias en 4 documentos |
| — | Security | Misión individual: revisión secretos | GitHub | .env.local detectado, [REDACTED] |
| — | QA | Misión individual: suite de pruebas | GitHub | 389/389 PASS |
| — | Compliance | Misión individual: revisión backlog | GitHub | DECISIONS.md leído, 0 tareas sin estado |
| — | Sentinel | Misión individual: inspección sistema | GitHub | 4 ejecuciones, 0 FAIL, 0 BLOCKED |
| — | Constructor | Misión individual: inspección task-executor | GitHub | Sintaxis OK, 28764 bytes |
| — | Finance | Misión individual: revisión lockfiles | Archivos locales | bun.lock + package-lock.json, WARN posible inconsistencia |
| — | Sales | Misión individual: revisión ventas | GitHub | Odoo/GTM/GA no declarados, WARN |
| — | Supply | Misión individual: migración control plane | GitHub | agency_tasks y agency_missions presentes |
| — | Growth | Misión individual: revisión cron | GitHub | 2 cron jobs en vercel.json |
| — | UX | Misión individual: Owner Console | Archivos locales | control-tower.tsx y agency-status.ts legibles |
| — | Release | Misión individual: artefactos build | GitHub | Artefactos presentes, 9 archivos sin staged |
| — | Orchestrator | Misión individual: ciclo autónomo | GitHub | 0 tareas elegibles, WARN |
| — | Constructor | Inspección issue #260 | GitHub | Issue leído, 12 tareas failed |
| — | QA | Análisis CI PR #269 | GitHub | 8/8 checks pass |
| — | Security | Revisión secretos en código | GitHub | 11 archivos con patrones de variable secreta, WARN |
| — | Release | Evaluación de release sin merge | GitHub | 15 PRs MERGEABLE/CLEAN, #263/#266/#269 listos |
| — | Sentinel | Inspección Edge Functions | Supabase | 6 funciones ACTIVE verificadas |
| — | Security | Revisión grants RLS | Supabase | Migración local preparada, no aplicada remoto |
| — | QA | Inspección deployments Vercel | Vercel | 10 despliegues Ready, 2 producción 11h |
| — | Sentinel | Verificación disponibilidad Vercel | Vercel | Todos Ready, 0 errores |
| — | Growth | Verificación OAuth Google | Google | OAuth OK, briefing 10:30 configurado |
| — | Sentinel | Verificación bot Telegram | Telegram | @marti_manoderecha_bot activo |

|---

## Tareas desbloqueadas y disponibles para asignar inmediatamente

| ID | Especialista sugerido | Tarea | Sistema | Riesgo | Autorización requerida |
|---|---|---|---|---|---|
| T-31 (continuación) | Security | Documentar permisos y cambios necesarios para eliminar bloqueos OIDC | Documentación | Bajo | No (documentación solamente) |
| T-3 (preparación) | Constructor | Preparar cambios de código para T-27 (rama aislada) | GitHub | Bajo | No (rama de trabajo, sin merge) |
| Finance | Finance | Modelo de costos de infraestructura por cliente | Local | Bajo | No |
| Finance | Finance | Margen por plan y costos variables | Local | Bajo | No |
| Finance | Finance | Punto de equilibrio y escenarios 10/50/100 clientes | Local | Bajo | No |
| Sales | Sales | Embudo de captación | Local | Bajo | No |
| Sales | Sales | Proceso de demostración | Local | Bajo | No |
| Sales | Sales | Seguimiento de oportunidades | Local | Bajo | No |
| Sales | Sales | Propuesta comercial | Local | Bajo | No |
| Sales | Sales | Métricas de conversión | Local | Bajo | No |
| Growth | Growth | Plan de adquisición de clientes piloto | Local | Bajo | No |
| Growth | Growth | Estrategia de posicionamiento | Local | Bajo | No |
| Growth | Growth | Calendario de acciones | Local | Bajo | No |
| Growth | Growth | Indicadores de adquisición y retención | Local | Bajo | No |

|---

## Regla de asignación

- Asignar automáticamente cada tarea al especialista correspondiente según la matriz AGENCY_EXECUTION_MATRIX.md.
- Ejecutar en paralelo cuando no existan dependencias.
- No asignar dos tareas incompatibles sobre el mismo archivo o recurso simultáneamente.
- Si un especialista falla dos veces con estrategia equivalente, cambiar estrategia.
- Continuar con otras tareas independientes cuando una integración esté bloqueada.
- No esperar confirmación del owner para tareas ordinarias, reversibles y autorizadas.
- Escalar solo: merges a main, migraciones de producción, cambios de RLS/auth, despliegues críticos, gastos, publicaciones externas, acciones irreversibles sobre datos.

---

## Checkpoint de persistencia

Este tablero se actualiza tras cada cambio de estado de especialista. Los estados se persisten en:
- Git (documentos en `docs/launch/`)
- Supabase (cuando T-20 esté resuelto y los grants de `agency_*` tablas estén aplicados remoto)

Hasta entonces, el tablero vive solo en Git y no tiene persistencia duradera en Supabase.