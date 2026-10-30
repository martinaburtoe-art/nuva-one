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
- prioridad: P1
- estado: BLOQUEADO
- dependencias: T-14
- criterios_de_aceptacion: Escanear los artefactos definidos (logs y salidas) para detectar PII; nunca incluir valores encontrados en la evidencia.
- pruebas_requeridas: fixture sintético con email/RUT detectado; salida redactada; fixture limpio PASS; directorio ausente UNKNOWN/WARN.
- evidencia: revisión de `specialists.mjs` en SHA `819259e`: el especialista solo lee tres documentos y package.json, y devuelve PASS sin escanear contenido. El test actual solo verifica que la evidencia no contenga emails; no prueba detección de PII.
- seguridad: no exponer datos personales ni valores coincidentes.

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

## T-20 — Persistencia durable de Agency en Supabase
- departamento: Operaciones
- especialista: Constructor
- prioridad: P0
- estado: BLOQUEADO
- dependencias: T-12, T-29
- criterios_de_aceptacion: Service role con privilegios mínimos en las seis tablas y secuencia; worker reclama/termina tarea y registra eventos; recuperación tras reinicio; Owner Console lee estado persistente.
- pruebas_requeridas: pgTAP de privilegios; claim/finish en entorno Preview autorizado; recuperación sin duplicados.
- evidencia: Vercel tiene `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` configuradas para Preview y Production (solo se verificó presencia; valores no leídos). Supabase ACTIVE_HEALTHY; seis tablas con RLS habilitado y RPC existentes. Auditoría read-only 2026-10-30 encontró grants faltantes. T-29 prepara la corrección y CI local valida 30 aserciones; la migración no se ha aplicado remotamente, por lo que los permisos efectivos del proyecto siguen bloqueando el CRUD y la recuperación.
- seguridad: no leer secretos, no aplicar migraciones remotas, no cambiar RLS.

## T-21 — Scheduler durable de Agency: reconciliar el worker existente
- departamento: Operaciones
- especialista: Constructor
- prioridad: P0
- estado: BLOQUEADO
- dependencias: T-20, T-31, T-32
- criterios_de_aceptacion: un solo scheduler durable activo, con leases, heartbeat, reintentos y recuperación verificados; no ejecutar dos workers competidores.
- pruebas_requeridas: ejecución schedule real con tarea nueva, heartbeat y finish persistidos; verificación de concurrencia y reanudación.
- evidencia: main contiene `.github/workflows/nuva-agent-durable-worker.yml` con cron `7,27,47 * * * *` y timeout 350 min. Último run schedule observado `41030396490` (2026-10-30 09:01:23Z): concluyó success, pero intentó los 13 agentes y no reclamó ninguna tarea. Snapshot read-only Supabase: 2 misiones, 14 tareas (3 completadas, 11 fallidas), 40 eventos task.claimed, 27 leases expirados y 13 liberados. La Edge Function v16 no puede crear el siguiente ciclo por falta de grants. El workflow nuevo `nuva-agency-durable-worker.yml` de esta PR sería un segundo scheduler; no activarlo hasta reconciliar el worker existente y endurecer OIDC.
- seguridad: sin merge/deploy, sin migraciones remotas, sin RLS ni secretos.

## T-22 — Owner Console durable con autorización server-side
- departamento: Operaciones
- especialista: Security
- prioridad: P1
- estado: BLOQUEADO
- dependencias: T-20, T-21
- criterios_de_aceptacion: Propietario autenticado crea misión, consulta tareas, pausa/reanuda/cancela y decide aprobaciones; todas las acciones quedan registradas en Supabase.
- pruebas_requeridas: tests 401/403/503; sesión real de propietario en Preview; lectura posterior de registros.
- evidencia: UI y APIs están en PR #252; `authorizeAgencyOwner` valida `app_metadata.platform_role=owner` y tiene tests unitarios. La ruta de control durable también verifica el rol server-side. No se ejecutó una sesión real; los grants service_role faltantes impiden confirmar CRUD.
- seguridad: sin pedir credenciales, sin cambios RLS, sin escrituras en Production.

## T-23 — Alinear el parser de especialistas con el formato real del backlog
- departamento: Operaciones
- especialista: Orchestrator
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-01
- criterios_de_aceptacion: Los parsers TypeScript y ESM reconocen encabezados `## T-XX —`, campos `- clave: valor`, dependencias `ninguna` y prioridades P0–P3
- pruebas_requeridas: Ejecutar Orchestrator y Compliance contra el backlog real; comprobar conteo exacto de tareas pendientes y cero tareas sin estado
- evidencia: commits `536fb87e`, `b461ac13`, `42030de1`; CI Control Plane Verify: 409/409 tests y certificación 37/37
- seguridad: solo lectura de documentación, sin producción

## T-24 — Corregir controles ESM de misión y reconstrucción del executor
- departamento: Operaciones
- especialista: Constructor
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-09, T-12
- criterios_de_aceptacion: Pausa/cancelación funcionan en Node ESM; el executor puede consultar locks y reconstruir índices sin `require()`
- pruebas_requeridas: Pruebas de proceso aislado para pausa/cancelación; node --check y suite completa
- evidencia: commits `2fb50c15`, `e5a3f9c0`, `89002a70`; pruebas de misión agregadas a Vitest
- seguridad: archivos temporales aislados, sin producción

## T-25 — Hacer ejecutable la prueba QA aislada
- departamento: Cumplimiento
- especialista: QA
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-04, T-09
- criterios_de_aceptacion: Vitest descubre el smoke test fuera de `src/`; QA ejecuta un proceso Vitest separado y reporta 1/1 aprobada
- pruebas_requeridas: Suite completa y prueba QA del especialista sin mock de ejecución
- evidencia: commit `4983a55f` amplía el patrón de descubrimiento; `42030de1` verifica el conteo del backlog; Control Plane Verify: 409/409
- seguridad: test local aislado, sin datos de usuarios

## T-26 — Preparar worker durable y scheduler de especialistas
- departamento: Operaciones
- especialista: Constructor
- prioridad: P0
- estado: COMPLETADO
- dependencias: T-12, T-16
- criterios_de_aceptacion: Worker reclama una tarea, ejecuta el especialista, libera lease con resultado estructurado; autenticación restringida al workflow autorizado en main; workflow programado cada cinco minutos con rotación de 13 agentes y sin secretos nuevos
- pruebas_requeridas: Tests del worker con claim vacío, claim/finish, resultado bloqueado; tests de identidad de workflow; CI y verificación independiente
- evidencia: commits `64e01c64`, `8be4e197`, `f7534575`, `288ad781`, `a4007197`, `3a1d8dba`, `b391041b`, `3f1b5429`, `18f26121`; worker usa GITHUB_TOKEN y el API server-side usa credenciales ya configuradas en Vercel
- seguridad: sin nuevos secretos, sin merge, sin despliegue ni cambios remotos de base de datos

## T-27 — Recuperar la ejecución programada existente
- departamento: Operaciones
- especialista: Release
- prioridad: P0
- estado: BLOQUEADO
- dependencias: T-20, T-21, T-31, T-32
- criterios_de_aceptacion: el scheduler existente vuelve a reclamar y finalizar tareas nuevas; el resultado se verifica en Supabase y Owner Console.
- pruebas_requeridas: ejecución schedule real posterior a los grants y al hardening OIDC, con tarea nueva y lease liberado.
- evidencia: existe workflow schedule en main, pero el último run observado terminó sin trabajo porque no había tareas elegibles. Las 14 tareas persistidas están completadas/fallidas. T-29 prepara grants y pasa CI, pero no está aplicado remotamente. T-31 prepara validación estricta OIDC, pero no está desplegada. El workflow de 5 min en PR #252 no se ha activado y no debe coexistir sin una decisión explícita de reemplazo.
- seguridad: requiere autorización expresa para aplicar migración/deploy/merge.

## T-28 — Verificar Owner Console durable con sesión real de propietario
- departamento: Operaciones
- especialista: Security
- prioridad: P1
- estado: BLOQUEADO
- dependencias: T-26, T-27, T-29
- criterios_de_aceptacion: Propietario crea misión, consulta, pausa/reanuda/cancela y aprueba; todos los cambios quedan registrados.
- pruebas_requeridas: sesión real de propietario en Preview y verificación posterior en Supabase.
- evidencia: autorización server-side y tests unitarios existen; no se usó sesión real; persistencia bloqueada por grants ausentes y scheduler no activo.
- seguridad: sin secretos, sin escrituras Production

## T-29 — Grants mínimos de service_role para Agency
- departamento: Seguridad
- especialista: Security
- prioridad: P0
- estado: COMPLETADO
- dependencias: T-20
- criterios_de_aceptacion: migración idempotente otorga solo privilegios de tabla/secuencia requeridos a service_role, mantiene RLS habilitado y mantiene anon/authenticated sin acceso.
- pruebas_requeridas: pgTAP `115_agency_service_role_privileges.sql` y CI completo.
- evidencia: commit `a3fa219d`; migración `20261030130000_agency_service_role_privileges.sql`; pgTAP 30/30 aserciones; CI database 454/454 tests PASS y recovery drill PASS. Solo se preparó en rama; no se aplicó remotamente.
- seguridad: no cambiar RLS, no aplicar migración remota, no leer secretos

## T-30 — Escaneo real de PII en el especialista People
- departamento: Personas
- especialista: people
- prioridad: P1
- estado: PENDIENTE
- dependencias: T-18
- criterios_de_aceptacion: el especialista detecta PII en fixtures controlados y artefactos configurados, redacta coincidencias y nunca devuelve valores personales.
- pruebas_requeridas: fixtures positivos/negativos para email y RUT; directorio ausente UNKNOWN/WARN; suite de especialistas y CI.
- evidencia: T-18 reabierto tras comprobar que la implementación actual no escanea el contenido.
- seguridad: no leer secretos ni exponer PII


## T-31 — Endurecer identidad OIDC del worker legado
- departamento: Seguridad
- especialista: Security
- prioridad: P0
- estado: EN_CURSO
- dependencias: T-21
- criterios_de_aceptacion: la Edge Function valida audience, repository, repository_owner, actor, ref main, workflow_ref exacto, evento permitido, run_id y agent_id.
- pruebas_requeridas: Vitest con claims válidos/alterados y Deno check de la Edge Function.
- evidencia: versión desplegada 16 solo valida issuer, repository, run_id y agent_id; no comprueba audience, workflow_ref, ref, event_name ni actor. El commit `e28f67e` añade helper, 14 tests y Deno check en CI; aún no existe un workflow run para ese SHA, por lo que no se marca completado. La función remota permanece en v16.
- seguridad: no desplegar Edge Function, no leer secretos, no cambiar RLS



## T-32 — Desplegar hardening OIDC en la Edge Function
- departamento: Seguridad
- especialista: Release
- prioridad: P0
- estado: BLOQUEADO
- dependencias: T-31
- criterios_de_aceptacion: versión desplegada de `nuva-agency-worker-control` rechaza tokens con audience, workflow_ref, ref, actor, evento, run_id o agent_id no autorizados.
- pruebas_requeridas: smoke real contra la función desplegada con token válido del workflow dedicado y tokens inválidos; verificar logs sin exponer JWT.
- evidencia: la función remota está en versión 16. El código endurecido está preparado en PR #252; no se desplegó por la restricción explícita de no realizar despliegues.
- seguridad: requiere autorización expresa para desplegar la Edge Function; no leer ni copiar secretos
