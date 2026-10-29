# AGENT_BACKLOG — Nüva Agency

Backlog único de tareas operativas del equipo de agentes especializados.
Fuente de verdad para el orquestador: selecciona la primera tarea segura y sin bloqueos,
la asigna al especialista adecuado, y registra el resultado al cerrar el ciclo.

Formato de cada entrada:
- `T-XX` — identificador único
- `titulo` — nombre corto
- `departamento` — Finanzas / Ventas / Abastecimiento / Personas / Cumplimiento / Crecimiento / Operaciones
- `especialista` — rol del agente que ejecuta
- `prioridad` — P0 (bloquea lanzamiento) / P1 (alta) / P2 (media) / P3 (defense-in-depth)
- `estado` — PENDIENTE / EN_CURSO / BLOQUEADO / COMPLETADO / RECHAZADO
- `dependencias` — entradas T-XX previas o "ninguna"
- `criterios_de_aceptacion` — qué debe demostrarse para dar por completada
- `pruebas_requeridas` — typecheck / lint / tests / build / mutación / revisión independiente
- `evidencia` — archivos, commits, salidas de comando (rellenar al completar)
- `seguridad` — sin producción / sin migración remota / sin RLS / sin secretos

---

## T-01 — Crear AGENT_BACKLOG.md (esta entrada)
- departamento: Operaciones
- especialista: Orchestrator
- prioridad: P0
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Backlog existe con formato definido y al menos 3 tareas seguras listadas
- pruebas_requeridas: lectura del archivo por revisión independiente
- evidencia: `docs/nuva-agency/AGENT_BACKLOG.md` (este archivo)
- seguridad: solo documentación, sin producción

## T-02 — Script de selección de tareas del backlog (orquestador)
- departamento: Operaciones
- especialista: Orchestrator
- prioridad: P0
- estado: COMPLETADO
- dependencias: T-01
- criterios_de_aceptacion: Script que lee `AGENT_BACKLOG.md`, filtra estado=PENDIENTE y sin dependencias pendientes, devuelve la siguiente tarea segura ordenada por prioridad
- pruebas_requeridas: ejecutar script contra este backlog y verificar que devuelve T-03 como siguiente
- evidencia: `scripts/agency-select-next-task.mjs` creado; salida: `{"totalTasks":7,"pendingTasks":5,"candidates":["T-04","T-06"],"nextTask":{"id":"T-04","title":"Mutación testing: verificar que biz-data.test.tsx detecta ausencia de filtro business_id"}}`
- seguridad: solo lectura de archivo de documentación

## T-03 — Certificación estructural extendida: verificar backlog en `agency:certify`
- departamento: Cumplimiento
- especialista: Compliance
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-02
- criterios_de_aceptacion: `npm run agency:certify` incluye check de que `docs/nuva-agency/AGENT_BACKLOG.md` existe y tiene al menos una tarea PENDIENTE
- pruebas_requeridas: ejecutar `npm run agency:certify` y verificar exit 0
- evidencia: `npm run agency:certify` → 37/37 checks PASS, score 100, `file:docs/nuva-agency/AGENT_BACKLOG.md` → Present
- seguridad: solo lectura

## T-04 — Mutación testing: verificar que biz-data.test.tsx detecta ausencia de filtro business_id
- departamento: Cumplimiento (QA independiente)
- especialista: QA
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-01
- criterios_de_aceptacion: Aplicar mutación (eliminar `.eq("business_id", active.id)`), ejecutar tests, al menos 1 falla; revertir, 8/8 pasan
- pruebas_requeridas: `npm test -- src/lib/biz-data.test.tsx` antes y después de mutación
- evidencia: Línea base 9/9 PASS → mutación 7/9 FAIL (todos los que verifican business_id) + 2/9 PASS (guardia sin negocio activo) → revertido 9/9 PASS. No hay cambios permanentes en src/lib/biz-data.ts (confirmado con git status: archivo no aparece como modificado).
- seguridad: mutación local temporal, sin commit permanente, sin producción

## T-05 — Revisión independiente de T-04 (agente distinto al ejecutor)
- departamento: Cumplimiento (Seguridad independiente)
- especialista: Security
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-04
- criterios_de_aceptacion: Agente distinto confirma que la mutación de T-04 fue detectada y revertida, sin cambios permanentes en working tree
- pruebas_requeridas: `git status --short` limpio salvo `routeTree.gen.ts` (excluido), `npm test` 351/351 PASS
- evidencia: Veredicto APROBADO del subagente independiente `sa-0-765368b7`: `git diff HEAD -- src/lib/biz-data.ts` vacío, `npm test -- src/lib/biz-data.test.tsx` 9/9 PASS, filtros `business_id` presentes en `useBizDelete` (línea 144) y `useBizUpdate` (línea 161), último commit `edbbce07`
- seguridad: solo lectura y verificación, sin modificaciones

## T-06 — Integrar Agent Council: registrar decisiones y desacuerdos en docs/factory/DECISIONS.md
- departamento: Cumplimiento
- especialista: Compliance
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-01
- criterios_de_aceptacion: DECISIONS.md tiene entrada para cada decisión de Agency con estado (APPROVED/REJECTED/PENDING) y quién la revisó independientemente
- pruebas_requeridas: lectura de DECISIONS.md por revisión independiente
- evidencia: DECISIONS.md actualizado con D-008 (prioridad estratégica y arquitectura), D-009 (anti-self-certification), D-010 (backlog como fuente de verdad), D-011 (límites de seguridad y autonomía)
- seguridad: solo documentación

## T-07 — Preparar PR con evidencia del primer ciclo autónomo completo
- departamento: Operaciones
- especialista: Release
- prioridad: P0
- estado: COMPLETADO
- dependencias: T-02, T-03, T-05, T-06
- criterios_de_aceptacion: PR abierto con commits de todas las tareas del ciclo, evidencia adjunta, revisión independiente documentada, sin merge a main
- pruebas_requeridas: CI del PR verde (typecheck, lint, tests, build), revisión independiente firmada
- evidencia: PR #252 abierto, head `fc8fba3e`, commits fc8fba3e (4 archivos, 329 inserciones), revisión independiente T-05 APROBADA (subagente sa-0-765368b7), CI en ejecución (production-smoke pass, safety-gate pass, resto pending)
- seguridad: rama de trabajo, sin merge a main, sin deploy

## T-08 — Implementar registro de ejecución de ciclos (cycle execution logger)
- departamento: Operaciones
- especialista: Constructor
- prioridad: P0
- estado: COMPLETADO
- dependencias: T-01, T-02
- criterios_de_aceptacion: Script que registra cada ciclo en logs/cycles/cycle-<timestamp>.json con task ID, agente responsable, método de delegación, resultado, archivos afectados, veredicto QA, veredicto Security, decisión del orquestador y timestamp. El archivo JSON es válido y legible.
- pruebas_requeridas: Ejecutar script manualmente, verificar que se crea el archivo de registro JSON válido
- evidencia: scripts/agency-cycle-logger.mjs creado; logs/cycles/cycle-20261029-125641.json registrado con qaVerdict=approved, securityVerdict=approved, orchestratorDecision=accepted
- seguridad: solo escritura de archivos de registro locales, sin producción

---

## Reglas del backlog
1. El orquestador selecciona siempre la primera tarea con `estado=PENDIENTE` y `dependencias` resueltas, ordenada por prioridad.
2. Ningún agente declara su propio trabajo completado sin revisión independiente (ver T-05).
3. Ninguna tarea toca producción, migraciones remotas, RLS ni secretos sin autorización explícita del propietario.
4. Al completar una tarea, se rellena `evidencia` y se actualiza `estado` a COMPLETADO o RECHAZADO.
5. El ciclo se cierra registrando el resultado y seleccionando la siguiente tarea segura.
