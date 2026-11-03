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
| 1 | Constructor | IDLE | — | — | Commit cd8a4cea (fix CI people + AbortSignal) | Implementar tarea acotada en rama aislada cuando se asigne |
| 2 | Orchestrator | WORKING | Ciclo autónomo INSPECT→NEXT TASK | GitHub, Supabase, Vercel, archivos locales | Revisión PRs #263/#266/#269, verificación CI, creación documentos AGENCY_*.md | Asignar próxima tarea desbloqueada |
| 3 | Finance | IDLE | — | — | — | Modelo de costos de infraestructura (Supabase, Vercel, IA) |
| 4 | Sales | IDLE | — | — | — | Estrategia comercial SaaS B2B pymes Chile |
| 5 | Supply | IDLE | — | GitHub, Supabase (lectura) | Revisión de módulo inventario en homepage verificada | Validar esquema de inventario local |
| 6 | People | IDLE | — | GitHub | 40/40 tests PASS, evidencia PII scan emitida | Escaneo PII en nuevos documentos |
| 7 | Compliance | IDLE | — | GitHub | Lint 0 errores, revisión de límites de seguridad | Auditar nuevos cambios antes de merge |
| 8 | Growth | IDLE | — | — | — | Plan de crecimiento y adquisición |
| 9 | Security | IDLE | — | GitHub, Supabase | OIDC hardening commit e28f67e (14/14 PASS), Edge v16 desplegada | Verificar hardening OIDC en deploy remoto (pendiente autorización) |
| 10 | QA | IDLE | — | GitHub | 429/429 PASS, lint 0, typecheck 0, agency:certify PASS | Revalidar tras próximos cambios |
| 11 | Sentinel | IDLE | — | GitHub, Vercel, Supabase | CI #269 verificado (8/8), despliegues Vercel listados | Monitoreo continuo de sistemas |
| 12 | UX | IDLE | — | Vercel (web) | https://nuva-one.vercel.app revisada (módulos ventas, inventario, finanzas, CRM) | Revisar flujos de usuario en previews |
| 13 | Release | IDLE | — | GitHub, Vercel | PRs #263/#266/#269 MERGEABLE, CI 8/8 PASS, despliegues Ready | Preparar merge y despliegue (pendiente autorización owner) |

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

---

## Tareas desbloqueadas y disponibles para asignar inmediatamente

| ID | Especialista sugerido | Tarea | Sistema | Riesgo | Autorización requerida |
|---|---|---|---|---|---|
| T-31 (continuación) | Security | Documentar permisos y cambios necesarios para eliminar bloqueos OIDC | Documentación | Bajo | No (documentación solamente) |
| T-3 (preparación) | Constructor | Preparar cambios de código para T-27 (rama aislada) | GitHub | Bajo | No (rama de trabajo, sin merge) |
| Finance | Finance | Modelo de costos de infraestructura | Local | Bajo | No |
| Sales | Sales | Estrategia comercial SaaS B2B Chile | Local | Bajo | No |
| Growth | Growth | Plan de crecimiento y adquisición | Local | Bajo | No |

---

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