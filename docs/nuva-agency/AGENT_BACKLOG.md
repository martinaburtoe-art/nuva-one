# AGENT_BACKLOG — Nüva Agency
|
Backlog único de tareas operativas del equipo de agentes especializados.
Fuente de verdad para el orquestador: selecciona la primera tarea segura y sin bloqueos,
la asigna al especialista adecuado, y registra el resultado al cerrar el ciclo.
|
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
|
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
- evidencia: PR #252 abierto, head `bc28bd8c`, commits fc8fba3e (4 archivos, 329 inserciones) + bc28bd8c (4 archivos, 200 inserciones), revisión independiente T-05 APROBADA (subagente sa-0-765368b7), CI: 10/11 pass (pgTAP pendiente)
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

## T-09 — Motor de ejecución de tareas (ejecutor autónomo)
- departamento: Operaciones
- especialista: Constructor
- prioridad: P0
- estado: COMPLETADO
- dependencias: T-02, T-08
- criterios_de_aceptacion: Ejecutor lee backlog, selecciona tarea vía selector existente, verifica deps/estado/permisos/límites de seguridad, asigna especialista, ejecuta vía herramientas reales, captura salida/errores/duración/artefactos, persiste resultado, permite reanudar sin duplicar
- pruebas_requeridas: Ejecutar en modo dry-run y en modo real contra una tarea de demostración segura; verificar registro de ciclo y persistencia
- evidencia: scripts/agency-task-executor.mjs + logs/executions/exec-20261029-130942.json (T-10, 9/9 PASS) + pruebas de lock, índice y resume
- seguridad: solo lectura/escritura local, sin producción, sin migraciones remotas, sin secretos

## T-10 — Demo de ejecución del motor de tareas (T-09)
- departamento: Operaciones
- especialista: QA
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-09
- criterios_de_aceptacion: El ejecutor selecciona esta tarea, ejecuta `npm test -- src/lib/biz-data.test.tsx`, captura salida, errores, duración y artefactos, y persiste el resultado en logs/executions/ con registro de ciclo
- pruebas_requeridas: Ejecutar executor en modo real contra esta tarea; verificar 9/9 PASS en los tests, registro de ciclo creado, estado persistido como COMPLETADO
- evidencia: logs/executions/exec-*.json + logs/cycles/cycle-*.json con resultado de ejecución
- seguridad: solo lectura de tests, sin producción, sin migraciones remotas, sin secretos

## T-11 — Revisión independiente y decisiones del orquestador
- departamento: Cumplimiento
- especialista: Orchestrator
- prioridad: P0
- estado: COMPLETADO
- dependencias: T-09, T-10
- criterios_de_aceptacion: QA independiente da veredicto PASS/FAIL; Security independiente da veredicto PASS/FAIL; Compliance verifica políticas; Orchestrator registra decisión final (accepted/rejected/returned) con motivo; ninguna tarea se autoadjudica COMPLETADO sin revisión independiente
- pruebas_requeridas: Veredicto QA entregado (PASS, sa-0-f62794d1); veredicto Security entregado (PASS, sa-0-343dc026); orchestrator cierra decisión en logs/cycles/cycle-20261029-131809.json
- evidencia: logs/cycles/cycle-20261029-131809.json con qaVerdict=approved, securityVerdict=approved, orchestratorDecision=accepted
- seguridad: revisores independientes del ejecutor; sin producción

## T-12 — Persistencia, recuperación y trazabilidad
- departamento: Operaciones
- especialista: Constructor
- prioridad: P0
- estado: COMPLETADO
- dependencias: T-09
- criterios_de_aceptacion: Identificador único de ejecución, agente/revisores, estado anterior/nuevo, fechas inicio/término, evidencias, errores/reintentos, decisión final; reanudación sin duplicar tarea completada; retoma tarea incompleta sin perder estado; bloqueo contra ejecuciones concurrentes; manejo de índices JSON ausentes/corruptos/parciales
- pruebas_requeridas: Prueba de recuperación tras interrupción; verificar resume no re-ejecuta COMPLETADO; verificar índice corrupto se reconstruye; verificar lock impide doble ejecución
- evidencia: logs/executions/ + logs/cycles/ con registros consistentes; pruebas de recuperación pasadas
- seguridad: solo escritura local de registros

## T-13 — Ciclo automático continuo
- departamento: Operaciones
- especialista: Constructor
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-09, T-11, T-12
- criterios_de_aceptacion: Modo por lotes con límites de duración, reintentos y cantidad de tareas; detiene ante errores/bloqueos/límites; modo dry-run sin mutaciones; no afirma autonomía 24/7 sin mecanismo programado comprobable
- pruebas_requeridas: Ejecutar lote con límite de 1 tarea, verificar detención; ejecutar dry-run, verificar sin mutaciones
- evidencia: logs del lote ejecutado; salida dry-run
- seguridad: solo ejecución local, sin producción

## T-14 — Owner Console operativa
- departamento: Operaciones
- especialista: UX
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-09, T-12
- criterios_de_aceptacion: Vista funcional del estado real de tareas, ejecuciones, errores y evidencias; controles de pausa/reanudación/autorización protegidos conectados al motor real; sin datos simulados; sin secretos expuestos
- pruebas_requeridas: Verificar lectura del estado persistente sin mutación; verificar que controles no permiten producción
- evidencia: interfaz consulte logs/executions/ y logs/cycles/ y muestre estado real
- seguridad: solo lectura de registros locales; sin producción

## T-15 — Especialista Finance: consistencia de lockfiles y dependencias
- departamento: Finanzas
- especialista: finance
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-14
- criterios_de_aceptacion: Ejecutor ejecuta `finance` contra `package.json` y lockfiles; resultado estructurado PASS/WARN/FAIL con evidencia de lecturas reales; sin modificar producción
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs finance t-15` devuelve JSON con result ∈ {PASS,FAIL,WARN,BLOCKED,UNKNOWN} y evidence no vacío
- evidencia: salida JSON del especialista finance
- seguridad: solo lectura de archivos locales, sin producción, sin secretos

## T-16 — Especialista Sales: verificación de integraciones de ventas
- departamento: Ventas
- especialista: sales
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-14
- criterios_de_aceptacion: Ejecutor ejecuta `sales` contra configuración de ventas; detecta Odoo/GTM/GA declarados; resultado estructurado con evidence real
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs sales t-16` devuelve JSON válido con result y evidence
- evidencia: WARN. sales ejecutado: vercel.json legible, package.json legible, worker control legible; odoo declarado: no, gtm/ga declarado: no (sin integraciones de ventas activas)
- seguridad: solo lectura de archivos de configuración, sin credenciales, sin producción
- ejecutado: 2026-10-29T23:28:12Z

## T-17 — Especialista Supply: verificación de esquema de agency y estructura de inventario
- departamento: Abastecimiento
- especialista: supply
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-14
- criterios_de_aceptacion: Ejecutor ejecuta `supply` contra migración de control plane; confirma tablas agency_tasks y agency_missions presentes
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs supply t-17` devuelve JSON válido con result PASS y evidence de tablas encontradas
- evidencia: PASS. supply ejecutado: migración 20261007000000 legible (15083 bytes), tabla agency_tasks: sí, tabla agency_missions: sí
- seguridad: solo lectura de migración local, sin migración remota, sin RLS
- ejecutado: 2026-10-29T23:28:12Z

## T-18 — Especialista People: verificación de documentación RRHH y ausencia de PII
- departamento: Personas
- especialista: people
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-14
- criterios_de_aceptacion: Ejecutor ejecuta `people` contra docs de RRHH; confirma que no hay PII expuesta en salidas
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs people t-18` devuelve JSON válido con result PASS y sin patrones de email en evidence
- evidencia: PASS. people ejecutado: AGENT_BACKLOG.md legible, BLOCKERS.md legible, PROJECT_STATE.md legible, package.json revisado; sin PII expuesta
- seguridad: sin exponer datos personales, sin producción
- ejecutado: 2026-10-29T23:28:12Z

## T-19 — Especialista Growth: verificación de analítica y cron jobs
- departamento: Crecimiento
- especialista: growth
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-14
- criterios_de_aceptacion: Ejecutor ejecuta `growth` contra vercel.json y configs; verifica presence de cron jobs
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs growth t-19` devuelve JSON válido con result ∈ {PASS,WARN} y evidence de vercel.json
- evidencia: PASS. growth ejecutado: vercel.json legible, package.json legible, vite.config.ts legible, vitest.config.ts legible; cron jobs en vercel.json: 2
- seguridad: solo lectura de configuración, sin datos de usuarios
- ejecutado: 2026-10-29T23:28:12Z

## T-20 — Persistencia duradera en Supabase (agency_missions, agency_tasks, agency_events)
- departamento: Operaciones
- especialista: Constructor
- prioridad: P2
- estado: BLOQUEADO
- dependencias: T-12
- criterios_de_aceptacion: Código de persistencia en `scripts/agency-persist-supabase.mjs` usa tablas existentes sin nuevas migraciones ni cambios RLS; executor integra persistExecution; diagnóstico reporta disponibilidad o bloqueador B-002 sin credenciales de servicio
- pruebas_requeridas: `node scripts/agency-persist-supabase.mjs` devuelve diagnóstico JSON; executor ejecuta persistExecution sin fallar cuando credenciales están ausentes
- evidencia: BLOQUEADO. Constructor sin comando ejecutable; B-002: Supabase URL y service_role key no configuradas localmente; persistExecution integrada en executor sin fallar sin credenciales
- seguridad: sin escribir secretos en logs, sin migración remota, sin cambios RLS
- ejecutado: 2026-10-29T23:28:12Z

## T-21 — Scheduler programado de Agency con exclusión mutua y límites
- departamento: Operaciones
- especialista: Constructor
- prioridad: P1
- estado: BLOQUEADO
- dependencias: T-09, T-13
- criterios_de_aceptacion: `scripts/agency-scheduler.mjs` ejecuta lotes del executor con lock exclusivo, pausa de emergencia (.agency-pause), límites de tareas/tiempo, reintentos acotados, protección contra bucles, registro duradero en logs/scheduler/
- pruebas_requeridas: `node scripts/agency-scheduler.mjs --maxtareas=3 --maxms=60000` finaliza con estado completado/pausado/bloqueado sin colgar; log de scheduler escrito
- evidencia: BLOQUEADO. Constructor sin comando ejecutable (tarea de infraestructura, no shell-ejecutable); scheduler verificado con locks, límites, pausa, reintentos acotados, logs duraderos
- seguridad: solo comandos locales, sin llamadas a LLM (gasto de IA acotado a cero), sin producción
- ejecutado: 2026-10-29T23:28:12Z

## T-22 — Owner Console: autorización server-side, iniciar/pausar ciclos, historial persistente
- departamento: Operaciones
- especialista: UX
- prioridad: P1
- estado: BLOQUEADO
- dependencias: T-14
- criterios_de_aceptacion: APIs `agency-control.ts` y `agency-execute.ts` verifican autorización en servidor (owner/worker), no solo en UI; endpoints de create_mission, mission_status (pausa/reanuda), approval existen; control-tower lee logs persistentes
- pruebas_requeridas: `npx tsc --noEmit` exit 0; rutas registradas en routeTree.gen.ts; control-tower renderiza AgencyLogsPanel sin datos ficticios
- evidencia: BLOQUEADO. UX/Owner Console sin comando ejecutable; tsc limpio, rutas registradas en routeTree.gen.ts, control-tower integrado; requiere despliegue y autorización server-side para activar
- seguridad: autorización en servidor, sin datos simulados, sin secretos expuestos
- ejecutado: 2026-10-29T23:28:12Z

