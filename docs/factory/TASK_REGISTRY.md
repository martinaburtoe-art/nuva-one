# TASK_REGISTRY — Nüva One Factory

Registro de tareas: pendientes, en curso, bloqueadas, completadas y verificadas. Se actualiza al finalizar cada bloque de trabajo y después de cada cambio relevante de estado.

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
| T-06 | COMPLETADA | Fase 3: inspección de instalación Hermes + orquestador mínimo viable (ORCHESTRATOR.md) | commit `2aa31959`, capacidades verificadas (delegation, cronjob, session_search, memory, nuva-ci-diagnostics, nuva-supabase-guardian) |
|| T-07 | COMPLETADA | Mutación testing: `biz-data.test.tsx` detecta regresiones de `useBizUpdate`/`useBizDelete` | mutación aplicada → 6/8 fallan; revertida → 8/8 PASS; sin cambios permanentes de código ||
|| T-08 | COMPLETADA | Auditoría profunda de módulos `_authenticated/` restante: 43/43 rutas, matriz PASS/FAIL/BLOCKED/UNKNOWN, hallazgos P2 (shifts-table `deleteShift`, quotes `convert_quote_to_sale`, inventario-conteo `finalize_inventory_stocktake`, sales `create_fast_sale`) y P3 (conexiones, inventory sin `ModuleGuard` propio) | 43 rutas inspeccionadas; validaciones 350/350 PASS, typecheck PASS, lint 0 errores, build PASS; sin cambios permanentes de código en esta sesión ||

## Tareas pendientes
| ID | Estado | Título | Motivo de prioridad | Precondiciones |
|---|---|---|---|---|

|| T-09 | COMPLETADA | Crear `docs/factory/DECISIONS.md` con decisiones técnicas aprobadas | `docs/factory/DECISIONS.md` creado (7 decisiones: D-001 a D-007, todas APPROVED) |
|| T-17 | COMPLETADA | Cycle 1 de T-11: añadir `business_id` como defense-in-depth a `deleteShift` en `shifts-table.tsx` | `src/components/shifts/shifts-table.tsx` modificado (`.eq("business_id", businessId)`), typecheck PASS, lint 0 errores, tests 350/350 PASS, build PASS |
|| T-18 | COMPLETADA | Cycle 2 de T-11: añadir `ModuleGuard` a `conexiones.tsx` e `inventory.tsx`, agregar `conexiones` a MODULES en `use-business.ts` | 3 archivos modificados, typecheck PASS, lint 0 errores, tests 350/350 PASS, build PASS |
|| T-19 | COMPLETADA | Cycle 3 de T-11: prueba negativa de aislamiento cross-business en `biz-data.test.tsx` (usa business_id del activo, no hardcodeado) | `src/lib/biz-data.test.tsx` +1 test (351/351 PASS), typecheck PASS, lint 0 errores, build PASS |
|| T-20 | COMPLETADA | Revisión de consistencia final de documentos Factory (PROJECT_STATE, BLOCKERS, NEXT_ACTIONS, TASK_REGISTRY, DECISIONS) | Todos los documentos sincronizados con 351/351, HEAD 226241fe, PR #252 10/10 PASS |
|| T-10 | COMPLETADA | Ejecutar `nuva-ci-diagnostics` en PR #252 para confirmar CI verde post-commit `2aa31959` | 11/11 checks PASS en PR #252 (lint, typecheck, test, build, pgTAP, safety-gate, review, production-smoke, web-qa, Vercel preview, Factory release evidence) | gh pr checks 252 → todos PASS |
| T-11 | COMPLETADA | Ejecutar 3 demostraciones del ciclo de ejecución continua (ciclos 1, 2 y 3) | 3 ciclos completos con tareas reales, independientes y seguras, todas las puertas de calidad PASS | T-08, T-09 previas |
| T-12 | COMPLETADA | Inspección de migraciones Supabase en busca de operaciones destructivas o debilitamiento de RLS | 1 `DROP TABLE` (marketing module, 2026-08-01, ya aplicado); 0 `TRUNCATE`, 0 `DELETE FROM` sin WHERE; todas las `DROP POLICY` van con `CREATE POLICY` más restrictiva. No hay migraciones pendientes que requieran autorización. | 100+ archivos .sql inspeccionados |
|| T-13 | COMPLETADA | Implementar skill `nuva-ci-diagnostics` (roadmap item #9) | scripts/ci-diagnostics.py (diagnóstico de CI vía gh CLI con informe estructurado PASS/FAIL/WARN/BLOCKED/UNKNOWN), tests/test_ci_diagnostics.py (9/9 pruebas con fixtures simulados), gh pr checks 252 → 11/11 PASS, causa raíz confirmada, archivos versionados en commit fe633201, rama publicada en origen, paso de CI añadido a .github/workflows/ci.yml (setup-python + ejecución de --self-test y tests/test_ci_diagnostics.py) | scripts/ci-diagnostics.py, tests/test_ci_diagnostics.py, scripts/__init__.py, .github/workflows/ci.yml, gh pr checks 252 |

## Tareas bloqueadas
| ID | Estado | Bloqueador | Resolución requerida |
|---|---|---|---|
| T-14 | BLOQUEADA | Verificación OAuth final en producción (flujo de login real, persistencia de sesión) | B-001 (credenciales de Google) |
| T-15 | BLOQUEADA | Inspect completo de esquema remoto de Supabase | B-002 (service_role key o acceso solo-lectura) |
| T-16 | BLOQUEADA | Revisión de logs de producción en Vercel | B-003 (acceso a logs de Vercel) |

## Reglas del registro
- Una tarea pasa a COMPLETADA solo cuando tiene evidencia (commit, test output, build output, archivo creado).
- Una tarea pasa a BLOQUEADA solo cuando hay un bloqueo explícito documentado en BLOCKERS.md.
- Nunca afirmar que una tarea está completada si solo está planificada.
