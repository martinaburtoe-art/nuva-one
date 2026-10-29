# TASK_REGISTRY — Nüva One Factory

Registro de tareas: pendientes, en curso, bloqueadas, completadas y verificadas. Se actualiza al finalizar cada bloque de trabajo.

## Formato
`ID | Estado | Título | Alcance | Archivos permitidos | Criterios de aceptación | Pruebas requeridas | Restricciones | Evidencia`

## Tareas completadas y verificadas
| ID | Estado | Título | Evidencia |
|---|---|---|---|
| T-01 | COMPLETADA | Parche `useBizDelete`/`useBizUpdate` con guardia + filtro `business_id` | commit `edbbce07`, tests 8/8 PASS, typecheck PASS |
| T-02 | COMPLETADA | Pruebas de regresión `biz-data.test.tsx` + vitest config | commit `b0656810`, suite 350/350 PASS |
| T-03 | COMPLETADA | Aislamiento multiempresa: `use-business.ts` sin auto-fallback, `settings.delete` con `isOwner` | commit `921fb2d6`, typecheck PASS, tests 350/350 PASS, build PASS |
| T-04 | COMPLETADA | Verificación de estado real del repositorio (Fase 1) | git status/log, PR #252 abierto MERGEABLE, tests 350/350, typecheck PASS, build PASS |
| T-05 | COMPLETADA | Memoria persistente Factory: `docs/factory/PROJECT_STATE.md`, `BLOCKERS.md`, `NEXT_ACTIONS.md`, `TASK_REGISTRY.md` | archivos creados en `docs/factory/` |

## Tareas pendientes
| ID | Estado | Título | Motivo de prioridad | Precondiciones |
|---|---|---|---|---|
| T-06 | PENDIENTE | Fase 3: Inspeccionar instalación real de Hermes y definir orquestador mínimo | Requisito previo para cualquier automatización multiagente | T-04, T-05 completadas |
| T-07 | PENDIENTE | Auditoría de módulos restantes `_authenticated/` no leídos (ai, billing, catalog, customer-*, finance-*, help-center, mfa-required, mobile-scanner, people-*, pricing-calculator, shifts, shipments) | Cerrar Fase 1 (auditoría completa) | T-04 completada |
| T-08 | PENDIENTE | Crear `docs/factory/DECISIONS.md` con decisiones técnicas aprobadas | Complementar memoria persistente | T-05 completada |
| T-09 | PENDIENTE | Implementar skill `nuva-supabase-guardian` (roadmap item #8) | Capacidad de verificación de migraciones | Roadmap, T-06 |
| T-10 | PENDIENTE | Implementar skill `nuva-ci-diagnostics` (roadmap item #9) | Diagnóstico de CI roto | Roadmap, T-06 |

## Tareas bloqueadas
| ID | Estado | Bloqueador | Resolución requerida |
|---|---|---|---|
| T-11 | BLOQUEADA | Verificación OAuth final en producción (flujo de login real, persistencia de sesión) | B-001 (credenciales de Google) |
| T-12 | BLOQUEADA | Inspect completo de esquema remoto de Supabase | B-002 (service_role key o acceso solo-lectura) |
| T-13 | BLOQUEADA | Revisión de logs de producción en Vercel | B-003 (acceso a logs de Vercel) |

## Reglas del registro
- Una tarea pasa a COMPLETADA solo cuando tiene evidencia (commit, test output, build output, archivo creado).
- Una tarea pasa a BLOQUEADA solo cuando hay un bloqueo explícito documentado en BLOCKERS.md.
- Nunca afirmar que una tarea está completada si solo está planificada.
