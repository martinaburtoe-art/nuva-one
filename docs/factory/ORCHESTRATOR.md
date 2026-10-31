# ORCHESTRATOR — Nüva One Factory (mínimo viable)

Orquestador de continuidad construido sobre capacidades **reales** de Hermes en esta instalación. No hay 8 procesos permanentes: empieza con el menor número de agentes reales y se demuestra la coordinación antes de ampliar.

## Mecanismos de Hermes disponibles (verificados)

| Capacidad | Herramienta | Estado |
|---|---|---|
| Delegación de tareas a subagentes aislados | `delegate_task` | Disponible |
| Programación de jobs recurrentes/uno-off | `cronjob_manage` | Disponible (1 job: briefing matutino 10:30, fallando) |
| Ejecución en segundo plano con notificación | `terminal(background=True, notify=True)` | Disponible |
| Recuperación de sesiones pasadas | `session_search` | Disponible |
| Memoria duradera (máx. ~2200 chars, toda sesión) | `memory` | Disponible (limitada) |
| Persistencia versionada en repo | `docs/factory/` | Creado (PROJECT_STATE, BLOCKERS, NEXT_ACTIONS, TASK_REGISTRY) |
| Diagnóstico CI (read-only) | skill `nuva-ci-diagnostics` | Instalada, lista |
| Seguridad Supabase/RLS (read-only) | skill `nuva-supabase-guardian` | Instalada, lista |
| Operaciones Supabase CLI | skill `supabase` | Instalada, lista |
| Polling RSS/API/GitHub | skill `watchers` | Instalada, lista |
| Agentes autónomos (coding) | `claude-code`, `codex`, `opencode`, `computer-use`, `hermes-agent` | Builtin, instalados |

## Roles del orquestador (mínimo viable, 4 roles reales)

1. **Orquestador y arquitectura** — Hermes Agent (este proceso). Mantiene el objetivo global, divide el trabajo, registra dependencias, delega, evita conflictos de edición sobre los mismos archivos, revisa evidencia, rechaza resultados incompletos, reintenta fallos controladamente, actualiza la memoria persistente, selecciona la siguiente tarea segura.
2. **Backend, Supabase y modelo de datos** — ejecuta `nuva-supabase-guardian` + `supabase` CLI (read-only). Revisa RLS, políticas, SECURITY DEFINER, grants, migraciones. Nunca toca producción.
3. **Frontend, QA y pruebas de regresión** — ejecuta `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build`, `nuva-ci-diagnostics`. Verifica que no haya falsos PASS.
4. **DevOps, CI y despliegues** — `gh pr checks`, `gh run list/view`, `nuva-ci-diagnostics`, vercel. Nunca hace merge ni deploy sin autorización explícita.

Roles 5-8 (finanzas, accesibilidad, auditor independiente) se activan como subagentes delegados cuando una tarea los requiera, no como procesos permanentes.

## Modelo de tarea delegada

Cada tarea delegada incluye:
- Identificador único (T-XX)
- Objetivo, alcance, archivos o módulos permitidos
- Dependencias, criterios de aceptación, pruebas requeridas
- Restricciones de seguridad, resultado esperado, estado y evidencia

## Ciclo de ejecución continua (Fase 4)

1. Recuperar el estado persistente (`docs/factory/PROJECT_STATE.md`, `BLOCKERS.md`, `TASK_REGISTRY.md`)
2. Verificar el estado real del repositorio (`git status`, `git log`, `git diff`)
3. Identificar la tarea prioritaria pendiente (`NEXT_ACTIONS.md`)
4. Comprobar sus dependencias
5. Asignarla al agente/rol apropiado (o ejecutar directamente si es seguro y local)
6. Ejecutar cambios aislados y trazables (commit en rama de trabajo, nunca `main`)
7. Ejecutar pruebas específicas (vitest, typecheck, lint, build)
8. Ejecutar las puertas de calidad pertinentes
9. Revisar el diff y los riesgos
10. Registrar resultados y bloqueos (`TASK_REGISTRY.md`, `BLOCKERS.md`)
11. Actualizar la memoria (`docs/factory/`, `memory` si aplica)
12. Seleccionar la siguiente tarea segura

Límites: tiempo de espera por tarea, reintentos controlados (máximo 2 intentos equivalentes fallidos antes de cambiar de estrategia), detección de bucles, parada clara si se requiere autorización humana.

## Reglas de seguridad (no negociables)

- No `git reset --hard`, `git clean -fd`, borrados masivos, eliminación de stashes.
- No sobrescribir archivos con cambios existentes sin revisar primero.
- No eliminar ni reemplazar `bun.lock`, `package-lock.json` ni lockfiles sin confirmar gestor e impacto.
- No inventar resultados. Distinguir PASS / FAIL / BLOCKED / UNKNOWN.
- No crear agentes ficticios ni afirmar ejecución paralela sin evidencia.
- No desplegar a producción ni hacer merge a `main` sin autorización explícita.
- Nunca exponer secretos, tokens, claves privadas. Usar `[REDACTED]`.
- No ejecutar migraciones remotas, cambios de RLS, eliminaciones de datos ni modificaciones destructivas de producción sin autorización explícita.

## Primera demostración (pendiente)

Ejecutar al menos 3 tareas independientes y reales mediante delegación, verificar que:
- Las tareas se registran antes de ejecutarse (`TASK_REGISTRY.md`)
- Los agentes tienen responsabilidades distintas y reales
- Se evitan conflictos de edición (una tarea por archivo a la vez)
- Los resultados incluyen evidencia (commits, test output, archivos)
- Los errores se clasifican correctamente (PASS/FAIL/BLOCKED/UNKNOWN)
- La memoria se actualiza al finalizar
- Una sesión nueva puede recuperar el estado y seleccionar la siguiente tarea sin reconstruir contexto

## Estado del orquestador

**ACTIVO** — Primera tarea delegada en curso: verificación de que `biz-data.test.tsx` detecta regresiones de `useBizUpdate`/`useBizDelete` cuando se elimina el filtro `business_id`.
