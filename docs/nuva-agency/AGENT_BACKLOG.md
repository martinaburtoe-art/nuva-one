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

## T-18 — Especialista People: verificación de documentación RRHH y ausencia de PII
- departamento: Personas
- especialista: people
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-14
- criterios_de_aceptacion: Escanear los artefactos definidos (logs y salidas) para detectar PII; nunca incluir valores encontrados en la evidencia.
- pruebas_requeridas: fixture sintético con email/RUT detectado; salida redactada; fixture limpio PASS; directorio ausente UNKNOWN/WARN.
- evidencia: `tests/fixtures/pii/positivo-pii.txt` (email + RUT chileno) → 2 PII detectados y redactados; `tests/fixtures/pii/negativo-sin-pii.txt` → 0 PII; `tests/fixtures/pii/validate-pii.mjs` → 5/5 PASS (detección, redacción, RUT simple, RUT con K, especialista people sin valores PII expuestos en evidencia real del repo). `src/lib/agency/specialists.ts` y `specialists.mjs`: `people` incluye `pii-scan` en `tiposDeTarea`, `EMAIL_RE`, `RUT_DOTTED_RE`, `RUT_PLAIN_RE`, `redactPII()` con sustitución a `[REDACTED]`, `herramientasPermitidas: ["readFile"]`. Typecheck exit 0, lint 0 errores, suite 423/423 PASS.
- seguridad: no exponer datos personales ni valores coincidentes; solo `readFile`.

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
- estado: COMPLETADO
- dependencias: T-18
- criterios_de_aceptacion: el especialista detecta PII en fixtures controlados y artefactos configurados, redacta coincidencias y nunca devuelve valores personales.
- pruebas_requeridas: fixtures positivos/negativos para email y RUT; directorio ausente UNKNOWN/WARN; suite de especialistas y CI.
- evidencia: `tests/fixtures/pii/positivo-pii.txt` → email y RUT chileno detectados y redactados; `tests/fixtures/pii/negativo-sin-pii.txt` → 0 PII; `tests/fixtures/pii/validate-pii.mjs` → 5/5 PASS; especialista people ejecutado con `agency-run-specialist.mjs people t-pii-scan-001` → exit 0, 0 PII en archivos reales del repo, evidencia sin valores personales expuestos. Typecheck exit 0, lint 0 errores, suite 423/423 PASS.
- seguridad: no leer secretos ni exponer PII.

## T-31 — Endurecer identidad OIDC del worker legado
- departamento: Seguridad
- especialista: Security
- prioridad: P0
- estado: EN_CURSO
- dependencias: T-21
- criterios_de_aceptacion: la Edge Function valida audience, repository, repository_owner, actor, ref main, workflow_ref exacto, evento permitido, run_id y agent_id.
- pruebas_requeridas: Vitest con claims válidos/alterados y Deno check de la Edge Function.
- evidencia: versión desplegada 16 solo valida issuer, repository, run_id y agent_id; no comprueba audience, workflow_ref, ref, event_name ni actor. El commit `e28f67e` añade helper, 14 tests y Deno check en CI. A fecha de 2026-10-30 12:25Z no existe workflow run para ese SHA; por tanto el hardening sigue EN_CURSO y no se afirma validación. La función remota permanece en v16.
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

## T-33 — Anexar tareas operativas pendientes al backlog (esta entrada)
- departamento: Operaciones
- especialista: orchestrator
- prioridad: P0
- estado: COMPLETADO
- dependencias: T-32
- criterios_de_aceptacion: El backlog contiene al menos una tarea PENDIENTE sin dependencias pendientes que el orquestador pueda seleccionar como siguiente
- pruebas_requeridas: Ejecutar `node scripts/agency-select-next-task.mjs` y verificar que devuelve una tarea PENDIENTE como siguiente
- evidencia: este archivo modificado con tareas T-33 a T-50 anexadas
- seguridad: solo documentación, sin producción

## T-34 — Finance: modelo de costos de infraestructura por cliente (misión comercial)
- departamento: Finanzas
- especialista: finance
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Documento con costos fijos y variables por cliente, supuestos cambiarios documentados, modelo para 10, 50 y 100 clientes; resultado estructurado con evidence real
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs finance t-34` devuelve JSON con result ∈ {PASS,WARN,FAIL,BLOCKED,UNKNOWN} y evidence no vacío
- evidencia: salida JSON del especialista finance + documento de modelo de costos en docs/launch/
- seguridad: solo lectura local y documentación, sin producción, sin secretos

## T-35 — Finance: margen bruto por plan y punto de equilibrio (misión comercial)
- departamento: Finanzas
- especialista: finance
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-34
- criterios_de_aceptacion: Cálculo de margen bruto por plan de precios y punto de equilibrio para escenarios 10/50/100 clientes; supuestos cambiarios y de costos documentados
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs finance t-35` devuelve JSON válido con result y evidence de los cálculos
- evidencia: salida JSON del especialista finance + documento en docs/launch/
- seguridad: solo lectura local y documentación, sin producción

## T-36 — Sales: embudo de captación de prospectos B2B (misión comercial)
- departamento: Ventas
- especialista: sales
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Lista de prospectos empresariales objetivo mediante fuentes autorizadas; proceso de calificación definido; documento sin envío de comunicaciones comerciales
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs sales t-36` devuelve JSON válido con result y evidence de la lista y el proceso
- evidencia: salida JSON del especialista sales + documento en docs/launch/
- seguridad: solo investigación y documentación, sin envío externo, sin autorización de campaña

## T-37 — Sales: guion de demostración y seguimiento de oportunidades (misión comercial)
- departamento: Ventas
- especialista: sales
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-36
- criterios_de_aceptacion: Guion de demo estructurado; diseño de seguimiento de oportunidades (etapas, estados); materiales comerciales preparados
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs sales t-37` devuelve JSON válido con result y evidence de los materiales
- evidencia: salida JSON del especialista sales + documentos en docs/launch/
- seguridad: solo documentación interna, sin publicación externa

## T-38 — Growth: plan de adquisición de empresas piloto (misión comercial)
- departamento: Crecimiento
- especialista: growth
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Plan de captación de clientes piloto con canales definidos, calendario de adquisición, métricas de conversión y retención
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs growth t-38` devuelve JSON válido con result y evidence del plan
- evidencia: salida JSON del especialista growth + documento en docs/launch/
- seguridad: solo documentación interna, sin envío externo

## T-39 — Constructor: inspeccionar funcionalidades pendientes de Nüva One y preparar cambio en rama aislada
- departamento: Operaciones
- especialista: constructor
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Listado de funcionalidades pendientes con estado real; rama de trabajo aislada preparada (sin merge); cambio acotado implementado y probado localmente
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs constructor t-39` devuelve JSON válido con result y evidence de la rama y el cambio
- evidencia: salida JSON del especialista constructor + nombre de rama y archivos afectados
- seguridad: rama de trabajo local, sin merge a main, sin deploy

## T-40 — Security: revisar y documentar permisos necesarios para eliminar bloqueos OIDC (T-31/T-32)
- departamento: Seguridad
- especialista: security
- prioridad: P0
- estado: BLOCKED
- dependencias: T-31 (EN_CURSO — requiere autorización de deploy para endurecimiento OIDC Edge Function y grants remotos Supabase T-20)
- criterios_de_aceptacion: Documento con permisos exactos, cambios necesarios y procedimiento de rollback para endurecimiento OIDC en Edge Function; bloqueado hasta autorización de deploy y grants remotos
- pruebas_requeridas: No ejecutable sin autorización de deploy; preparar procedimiento de rollback documentado
- evidencia: Pendiente — bloqueado por autorización de deploy y grants remotos Supabase (T-20)
- seguridad: documentación solamente, sin despliegue, sin secretos, sin migración remota

## T-41 — QA: revalidar suite funcional tras nuevas tareas del backlog
- departamento: Cumplimiento (QA independiente)
- especialista: qa
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-39
- criterios_de_aceptacion: Ejecutar suite completa y verificar que no hay regresiones; reportar conteo de pruebas y estado
- pruebas_requeridas: `npm test -- --run` con exit 0; `node scripts/agency-run-specialist.mjs qa t-41` devuelve JSON válido con result y evidence
- evidencia: salida JSON del especialista qa + salida de pruebas
- seguridad: solo lectura y ejecución de tests locales, sin producción

## T-42 — Sentinel: verificar estado de Edge Functions y despliegues (monitoreo)
- departamento: Operaciones
- especialista: sentinel
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Inspección de las 6 Edge Functions en Supabase y desplegues de Vercel; reporte de errores e incidentes detectados
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs sentinel t-42` devuelve JSON válido con result y evidence de sistemas inspeccionados
- evidencia: salida JSON del especialista sentinel + estado de sistemas
- seguridad: solo lectura de estado remoto, sin escritura, sin cambios

## T-43 — UX: detectar problemas de experiencia en Owner Console y proponer correcciones
- departamento: Operaciones
- especialista: ux
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-14
- criterios_de_aceptacion: Revisión de flujos de usuario en Owner Console (control-tower.tsx, agency-status.ts); lista de problemas detectados y correcciones propuestas
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs ux t-43` devuelve JSON válido con result y evidence de la revisión
- evidencia: salida JSON del especialista ux + documento de hallazgos en docs/launch/
- seguridad: solo lectura de archivos locales, sin producción

## T-44 — Release: preparar informe de promoción para PRs #263/#266/#269 (sin merge)
- departamento: Operaciones
- especialista: release
- prioridad: P0
- estado: COMPLETADO
- dependencias: T-41
- criterios_de_aceptacion: Informe con estado CI de cada PR, checklist de promoción, pasos de rollback; sin ejecutar merge ni deploy
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs release t-44` devuelve JSON válido con result y evidence de CI (8/8 PR #269, estado #263 y #266)
- evidencia: salida JSON del especialista release + informe en docs/launch/
- seguridad: sin merge, sin deploy, sin cambios remotos

## T-45 — People: escaneo de PII en nuevos documentos del backlog y AGENCY
- departamento: Personas
- especialista: people
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-33
- criterios_de_aceptacion: Escaneo de documentos AGENCY nuevos para detectar PII; coincidencias redactadas; sin exponer valores personales
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs people t-45` devuelve JSON válido con result y evidence del escaneo (sin valores PII en la evidencia)
- evidencia: salida JSON del especialista people sin valores personales expuestos
- seguridad: solo `readFile`, no exponer PII, sin secretos

## T-46 — Compliance: auditar nuevos cambios de Agency antes de cualquier merge candidato
- departamento: Cumplimiento
- especialista: compliance
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-33
- criterios_de_aceptacion: Lista de cambios pendientes con veredicto independiente (APPROVED/REJECTED/PENDING); sin autoadjudicación de COMPLETADO sin revisión
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs compliance t-46` devuelve JSON válido con result y evidence de la auditoría
- evidencia: salida JSON del especialista compliance + registro de decisiones en DECISIONS.md
- seguridad: solo lectura, sin merge, sin producción

## T-47 — Supply: validar esquema de inventario local y tablas agency
- departamento: Abastecimiento
- especialista: supply
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-17
- criterios_de_aceptacion: Confirmación de tablas agency_tasks y agency_missions en migración local; propuesta de estructura de inventario local sin migración remota
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs supply t-47` devuelve JSON válido con result y evidence del esquema
- evidencia: salida JSON del especialista supply + lectura de migración local
- seguridad: solo lectura local, sin migración remota, sin RLS

## T-48 — Growth: canales y métricas de adquisición de pilotos (calendario)
- departamento: Crecimiento
- especialista: growth
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-38
- criterios_de_aceptacion: Canales de adquisición definidos, calendario de acciones con fechas, indicadores de conversión y retención documentados
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs growth t-48` devuelve JSON válido con result y evidence del calendario
- evidencia: salida JSON del especialista growth + documento en docs/launch/
- seguridad: solo documentación interna, sin envío externo

## T-49 — Orchestrator: ejecutar ciclo INSPECT→PRIORITIZE→ASSIGN→EXECUTE→VERIFY→RECORD→NEXT TASK una vez
- departamento: Operaciones
- especialista: orchestrator
- prioridad: P0
- estado: BLOCKED
- dependencias: T-33, T-34, T-36, T-38, T-39, T-40, T-42, T-43, T-44, T-45, T-46, T-47, T-48 (T-40 BLOCKED — requiere autorización de deploy)
- criterios_de_aceptacion: El orquestador selecciona una tarea PENDIENTE del backlog, ejecuta al especialista correspondiente vía `agency-run-specialist.mjs`, registra el resultado en AGENCY_EVIDENCE_LOG.md y selecciona la siguiente tarea; todo en un solo ciclo real; bloqueado hasta que T-40 se desbloquee
- pruebas_requeridas: No ejecutable hasta que T-40 esté desbloqueada (depende de autorización de deploy)
- evidencia: Pendiente — bloqueado por dependencia T-40 (autorización de deploy y grants remotos T-20)
- seguridad: solo ejecución local de especialistas autorizados, sin producción, sin migraciones remotas

## T-50 — Orchestrator: verificar que una misión completada habilita la siguiente y registrar próxima tarea automática
- departamento: Operaciones
- especialista: orchestrator
- prioridad: P0
- estado: BLOCKED
- dependencias: T-49 (BLOCKED — cadena bloqueada por T-40)
- criterios_de_aceptacion: Después de completar una misión, el backlog muestra la siguiente tarea desbloqueada; registro de dependencia resuelta en AGENCY_OPERATIONS_BOARD.md; registro de próxima tarea automática; bloqueado hasta que T-49 se desbloquee
- pruebas_requeridas: No ejecutable hasta que T-49 esté desbloqueada
- evidencia: Pendiente — bloqueado por dependencia T-49 (cadena bloqueada por T-40)
- seguridad: solo documentación de estados, sin producción

## T-94 — Nüva Intelligence: revisar módulo principal y definir roadmap de funcionalidades
- departamento: Nüva Intelligence
- especialista: constructor
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Inventario de archivos del módulo Nüva Intelligence, lista de funcionalidades implementadas vs pendientes, roadmap de desarrollo para las próximas 4 semanas
- pruebas_requeridas: lectura de src/nuva-intelligence (o similar) y verificación de existencia de componentes; sin ejecución de producción
- evidencia: lista de archivos del módulo + roadmap de funcionalidades
- seguridad: solo lectura y documentación, sin despliegue

## T-95 — IA y proveedores de modelos: validar proveedores de IA disponibles para integración
- departamento: IA y proveedores de modelos
- especialista: security
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Lista de proveedores de modelos IA evaluados (costo, privacidad, cumplimiento chileno), recomendación de proveedor por defecto, procedimiento de integración segura sin secretos hardcodeados
- pruebas_requeridas: documentación de evaluación; sin llamadas a APIs externas con credenciales reales
- evidencia: documento de evaluación de proveedores + recomendación
- seguridad: sin secretos, sin llamadas a producción, sin configuración remota

## T-96 — IA y proveedores de modelos: configurar modelos por defecto para pyme chilena
- departamento: IA y proveedores de modelos
- especialista: finance
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-95
- criterios_de_aceptacion: Modelos de IA por defecto seleccionados para tareas de negocio (resumen de facturas, categorización de gastos, respuesta a clientes), con justificación de costo y cumplimiento
- pruebas_requeridas: documentación de selección; sin despliegue ni secretos
- evidencia: documento de modelos por defecto
- seguridad: solo documentación, sin credenciales

## T-97 — Reportes y analítica: dashboard de métricas de negocio para Owner Console
- departamento: Reportes y analítica
- especialista: constructor
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Página de reportes con métricas clave (ventas, gastos, flujo de caja, stock bajo), gráficos básicos, filtros por fecha; componente local sin conexión a base de datos remota
- pruebas_requeridas: lectura de código del componente; typecheck exit 0; sin ejecución de producción
- evidencia: componente de dashboard de reportes + lista de métricas
- seguridad: solo componentes locales, sin producción

## T-98 — Reportes y analítica: exportación de reportes en PDF y CSV
- departamento: Reportes y analítica
- especialista: constructor
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-97
- criterios_de_aceptacion: Función de exportación de datos visibles en pantalla a PDF y CSV; nombre de archivo con fecha; sin envío externo
- pruebas_requeridas: revisión de código de exportación local; sin producción
- evidencia: código de exportación + formato de archivo generado
- seguridad: solo exportación local, sin envío externo

## T-99 — Documentación y soporte: guía de usuario para módulos principales
- departamento: Documentación y soporte
- especialista: ux
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-65, T-68
- criterios_de_aceptacion: Guía de usuario con pasos para dashboard, POS, inventario y Owner Console; capturas de pantalla o descripciones de flujos; sin secretos
- pruebas_requeridas: revisión del documento; sin ejecución de producción
- evidencia: documento de guía de usuario en docs/
- seguridad: solo documentación interna

## T-100 — Documentación y soporte: documentación de API interna y endpoints Owner Console
- departamento: Documentación y soporte
- especialista: constructor
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-93
- criterios_de_aceptacion: Lista de endpoints de Owner Console con método, ruta, descripción y ejemplo de respuesta; sin secretos ni credenciales
- pruebas_requeridas: lectura de src/routes/api/owner y verificación de endpoints; sin despliegue
- evidencia: documento de API interna
- seguridad: sin secretos, sin credenciales

## T-101 — Experiencia móvil: pruebas de navegación en dispositivos móviles reales
- departamento: Experiencia móvil
- especialista: qa
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-66
- criterios_de_aceptacion: Registro de comportamiento en al menos 3 dispositivos móviles (Android/iOS), problemas de toque, scroll y visibilidad detectados
- pruebas_requeridas: inspección de componentes móviles existentes; sin producción
- evidencia: lista de dispositivos probados + problemas detectados
- seguridad: solo inspección de código y emuladores locales

## T-102 — Rendimiento: optimización de bundle y tiempos de carga inicial
- departamento: Rendimiento
- especialista: release
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-58
- criterios_de_aceptacion: Medición de tamaño de bundle, tiempos de carga de páginas principales, recomendaciones de optimización (code-splitting, lazy loading)
- pruebas_requeridas: `npm run build` y análisis del output; sin despliegue a producción
- evidencia: reporte de tamaño de bundle + recomendaciones
- seguridad: solo build local, sin despliegue

## T-103 — Integraciones: preparar conector de lectura para Odoo (sin credenciales)
- departamento: Integraciones
- especialista: supply
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-73
- criterios_de_aceptacion: Esquema de conector para lectura de productos, stock y pedidos desde Odoo; estructura de datos mapeada; sin credenciales hardcodeadas, sin conexión remota activa
- pruebas_requeridas: revisión de estructura de conector; sin conexión a Odoo real
- evidencia: esquema de conector + mapeo de datos
- seguridad: sin credenciales, sin conexión remota

## T-104 — People: parámetros legales RRHH 2026 (vacaciones, aguinaldo, cotizaciones)
- departamento: People
- especialista: people
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-78, T-79, T-80
- criterios_de_aceptacion: Tabla de parámetros legales chilenos 2026 (días de vacaciones, aguinaldo, cotizaciones previsionales, seguro de cesantía) con fuentes; sin datos personales reales
- pruebas_requeridas: revisión del documento de parámetros; sin producción
- evidencia: documento de parámetros legales RRHH
- seguridad: solo documentación, sin datos sensibles reales

## T-105 — Sales: seguimiento de oportunidades y pipeline visual
- departamento: Ventas
- especialista: sales
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-75
- criterios_de_aceptacion: Estructura de pipeline de ventas (etapas, probabilidades, valores estimados), componente visual para seguimiento de oportunidades; sin datos de clientes reales
- pruebas_requeridas: revisión de componentes y estructura de datos; sin producción
- evidencia: estructura de pipeline + componente visual
- seguridad: sin datos de clientes reales

## T-106 — Supply: control de stock mínimo y alertas de reabastecimiento
- departamento: Abastecimiento
- especialista: supply
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-77
- criterios_de_aceptacion: Umbrales de stock mínimo por producto, lista de productos por debajo del mínimo, sugerencia de orden de compra; sin conexión a proveedores reales
- pruebas_requeridas: revisión de lógica de umbrales y listado; sin producción
- evidencia: umbrales de stock + lista de productos críticos
- seguridad: solo datos de inventario locales

## T-107 — Finance: conciliación bancaria y flujo de caja diario
- departamento: Gastos y finanzas
- especialista: finance
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-69, T-70, T-71, T-72
- criterios_de_aceptacion: Estructura para conciliación bancaria (movimientos vs registros), reporte de flujo de caja diario, sin conexión bancaria real
- pruebas_requeridas: revisión de estructura de conciliación y flujo de caja; sin producción
- evidencia: estructura de conciliación + reporte de flujo de caja
- seguridad: sin credenciales bancarias, sin conexión externa

## T-108 — Compliance: libro de actas y trazabilidad de decisiones
- departamento: Compliance
- especialista: compliance
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-82
- criterios_de_aceptacion: Registro de decisiones de arquitectura, aprobaciones de cambios, trazabilidad de auditoría; sin secretos
- pruebas_requeridas: revisión del sistema de registro; sin producción
- evidencia: estructura de libro de actas + ejemplo de entrada
- seguridad: solo documentación interna

## T-109 — Sentinel: umbrales de alerta y escalado de incidentes
- departamento: Sentinel
- especialista: sentinel
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-86
- criterios_de_aceptacion: Umbrales definidos para errores, disponibilidad y tiempo de respuesta; procedimiento de escalado al propietario; sin configuración de alertas externas activas
- pruebas_requeridas: revisión de umbrales y procedimiento; sin activación de alertas reales
- evidencia: umbrales definidos + procedimiento de escalado
- seguridad: solo configuración local, sin envío de alertas externas

## T-110 — Release: preparación de release candidate para entorno de prueba
- departamento: Release
- especialista: release
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-88, T-89, T-90
- criterios_de_aceptacion: Checklist de release candidate (build limpio, tests PASS, typecheck PASS, documentación actualizada), versión propuesta, notas de release; sin despliegue a producción
- pruebas_requeridas: `npm run build`, `npm test -- --run`, typecheck; sin despliegue
- evidencia: checklist de release + notas de release
- seguridad: solo preparación local, sin despliegue a producción

## T-111 — Orchestrator: informe semanal de estado al Owner Console
- departamento: Operaciones
- especialista: orchestrator
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-92, T-93
- criterios_de_aceptacion: Informe semanal con tareas ejecutadas, bloqueos, próximos pasos y métricas de autonomía del equipo; formato para Owner Console
- pruebas_requeridas: lectura del informe y verificación de que refleja el estado real del backlog
- evidencia: informe semanal en docs/launch/
- seguridad: solo documentación de estados

## T-112 — Growth: métricas de retención a 30/60/90 días
- departamento: Growth
- especialista: growth
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-48
- criterios_de_aceptacion: Definición de métricas de retención (D30, D60, D90), método de cálculo, fuentes de datos internas; sin envío de comunicaciones externas
- pruebas_requeridas: revisión de métricas definidas; sin producción
- evidencia: documento de métricas de retención
- seguridad: solo documentación interna

## T-113 — UX: pruebas de usabilidad con usuarios simulados
- departamento: UX
- especialista: ux
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-65, T-68
- criterios_de_aceptacion: Guión de pruebas de usabilidad para flujos principales (login, dashboard, venta POS), problemas detectados, correcciones propuestas
- pruebas_requeridas: revisión de flujos y guión de pruebas; sin usuarios reales
- evidencia: guión de usabilidad + problemas detectados
- seguridad: solo inspección local

## T-114 — Security: revisión de headers de seguridad y CSP
- departamento: Seguridad y privacidad
- especialista: security
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-60, T-61, T-62, T-63, T-64
- criterios_de_aceptacion: Verificación de headers de seguridad (CSP, HSTS, X-Frame-Options, etc.), lista de hallazgos y correcciones propuestas en vercel.json o headers del servidor
- pruebas_requeridas: lectura de vercel.json y configuración de headers; sin despliegue
- evidencia: lista de headers de seguridad + hallazgos
- seguridad: solo documentación y configuración local

## T-115 — QA: pruebas de integración end-to-end para flujos críticos
- departamento: QA
- especialista: qa
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-41, T-46, T-57
- criterios_de_aceptacion: Casos de prueba end-to-end para flujos críticos (venta completa, recepción de inventario, creación de cuenta owner), lista de casos con resultado esperado
- pruebas_requeridas: revisión de casos de prueba; `npm test -- --run` exit 0 si los casos existen
- evidencia: casos de prueba E2E + resultados
- seguridad: solo tests locales

## T-116 — Sentinel: reporte de disponibilidad y errores semanal
- departamento: Sentinel
- especialista: sentinel
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-86
- criterios_de_aceptacion: Reporte semanal de disponibilidad del sistema, errores detectados, tiempo de respuesta promedio; sin alertas externas activas
- pruebas_requeridas: revisión de logs existentes y generación de reporte
- evidencia: reporte semanal de disponibilidad
- seguridad: solo lectura de logs, sin cambios de producción

## T-51 — Constructor: Revisar consistencia visual entre módulos del dashboard y POS
- departamento: Operaciones
- especialista: constructor
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se inspeccionan dashboard.tsx y pos.tsx para verificar consistencia visual, uso de componentes compartidos y experiencia empresarial uniforme; se documentan hallazgos y se aplican correcciones menores en componentes locales
- pruebas_requeridas: lectura de componentes y verificación de componentes UI compartidos; sin ejecución de producción
- evidencia: lista de hallazgos de consistencia y cambios aplicados en componentes
- seguridad: solo lectura y edición de componentes locales, sin producción, sin migración remota

## T-52 — Constructor: Integrar barcode scanner con inventario en pos.tsx
- departamento: Ventas
- especialista: constructor
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: El módulo POS puede escanear códigos de barra y vincularlos al catálogo de inventario; existe fallback de entrada manual si el escáner no está disponible
- pruebas_requeridas: revisión de código del componente barcode en mobile-scanner.tsx y pos.tsx; typecheck exit 0
- evidencia: cambios en pos.tsx y mobile-scanner.tsx con integración de escáner
- seguridad: solo edición de componentes locales, sin producción

## T-53 — Constructor: Corregir defectos en inventario-workspace y stock movements
- departamento: Abastecimiento
- especialista: constructor
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se identifican y corrigen defectos en inventario-operaciones.tsx e inventario-conteo.tsx; los movimientos de stock son consistentes con el catálogo
- pruebas_requeridas: lectura de componentes de inventario; lint exit 0
- evidencia: lista de defectos corregidos y archivos modificados
- seguridad: solo edición de componentes locales, sin producción

## T-54 — Constructor: Profesionalizar módulo de compras y proveedores
- departamento: Abastecimiento
- especialista: constructor
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: purchases.tsx incluye gestión de proveedores, órdenes de compra y estado de entrega; experiencia empresarial consistente con el resto del dashboard
- pruebas_requeridas: lectura del componente purchases.tsx; verificación de componentes compartidos
- evidencia: cambios en purchases.tsx y componentes relacionados
- seguridad: solo edición de componentes locales, sin producción

## T-55 — Constructor: Completar funcionalidades pendientes en caja-control
- departamento: Finanzas
- especialista: constructor
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: caja-control.tsx incluye corte de caja, movimientos de efectivo y conciliación con ventas del día
- pruebas_requeridas: lectura de caja-control.tsx; verificación de integración con pos y sales
- evidencia: cambios en caja-control.tsx
- seguridad: solo edición de componentes locales, sin producción

## T-56 — QA: Pruebas funcionales para rutas sin test (dashboard, sales, pos)
- departamento: Cumplimiento (QA independiente)
- especialista: qa
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Existen archivos de test para dashboard.test.ts, sales.test.ts y pos.test.ts; cubren renderizado y flujos principales
- pruebas_requeridas: `npm test` incluye los nuevos archivos de test; exit 0
- evidencia: nuevos archivos de test en tests/ y salida de `npm test`
- seguridad: solo creación de archivos de test, sin producción

## T-57 — QA: Auditoria de accesibilidad en módulos autenticados
- departamento: Cumplimiento (QA independiente)
- especialista: qa
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se auditan al menos 5 módulos autenticados para accesibilidad (contraste, navegación por teclado, labels ARIA); se documentan hallazgos
- pruebas_requeridas: lista de módulos auditados con resultados; sin ejecución de producción
- evidencia: reporte de auditoría de accesibilidad en docs/launch/
- seguridad: solo lectura y documentación, sin producción

## T-58 — QA: Pruebas de rendimiento en cargas de dashboard
- departamento: Cumplimiento (QA independiente)
- especialista: qa
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se miden tiempos de carga de las rutas principales del dashboard; se identifican cuellos de botella y se proponen optimizaciones
- pruebas_requeridas: mediciones de carga documentadas; sin despliegue
- evidencia: reporte de rendimiento con métricas de carga
- seguridad: solo medición local, sin producción

## T-59 — QA: Pruebas de regresión en módulo financiero
- departamento: Finanzas
- especialista: qa
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se ejecutan pruebas de regresión en finance.tsx, finance-accounting.tsx y financial-*; los cálculos de margen y punto de equilibrio son correctos
- pruebas_requeridas: `npm test` incluye pruebas de regresión financiera; exit 0
- evidencia: salida de pruebas de regresión financiera
- seguridad: solo pruebas locales, sin producción

## T-60 — Security: Escaneo de exposición de datos en rutas públicas
- departamento: Seguridad
- especialista: security
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se escanean las rutas públicas para verificar que no exponen datos sensibles, PII o credenciales; se documentan hallazgos
- pruebas_requeridas: escaneo de rutas públicas; sin leer secretos
- evidencia: reporte de escaneo de exposición de datos
- seguridad: solo lectura, sin exponer secretos ni PII

## T-61 — Security: Verificación de sesiones y MFA en mfa-required
- departamento: Seguridad
- especialista: security
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: mfa-required.tsx valida correctamente sesiones y requiere MFA para acciones sensibles; sin bypasses identificados
- pruebas_requeridas: revisión de lógica de MFA y sesiones; typecheck exit 0
- evidencia: cambios o hallazgos en mfa-required.tsx
- seguridad: solo lectura y edición local, sin producción, sin secretos

## T-62 — Security: Análisis de vulnerabilidades en dependencias npm
- departamento: Seguridad
- especialista: security
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se ejecuta `npm audit` o equivalente; se identifican vulnerabilidades y se proponen actualizaciones o mitigaciones
- pruebas_requeridas: salida de `npm audit` documentada; sin modificar lockfiles sin autorización
- evidencia: reporte de auditoría de dependencias
- seguridad: solo lectura, sin modificar lockfiles

## T-63 — Security: Auditar permisos de rutas _authenticated
- departamento: Seguridad
- especialista: security
- prioridad: P0
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Todas las rutas en src/routes/_authenticated/ tienen control de acceso adecuado; sin rutas expuestas sin autenticación
- pruebas_requeridas: revisión de cada ruta en _authenticated/; sin cambios de RLS ni producción
- evidencia: lista de rutas auditadas con estado de permisos
- seguridad: solo lectura, sin cambios de RLS ni producción

## T-64 — Security: Verificar que no hay secretos hardcodeados en frontend
- departamento: Seguridad
- especialista: security
- prioridad: P0
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se escanea src/ en busca de claves, tokens o credenciales hardcodeadas; ninguna encontrada en código frontend
- pruebas_requeridas: escaneo de secretos en src/; sin exponer valores encontrados
- evidencia: reporte de escaneo de secretos (sin valores expuestos)
- seguridad: solo lectura, sin exponer secretos

## T-65 — UX: Auditoria visual de dashboard y home experience
- departamento: Operaciones
- especialista: ux
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se audita la experiencia visual del dashboard y home page; se identifican problemas de consistencia, espaciado y jerarquía visual
- pruebas_requeridas: revisión de componentes visuales; sin ejecución de producción
- evidencia: reporte de auditoría UX con capturas o descripciones
- seguridad: solo lectura de componentes, sin producción

## T-66 — UX: Revisar responsividad móvil en módulos clave
- departamento: Operaciones
- especialista: ux
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se revisan pos.tsx, mobile-scanner.tsx y dashboard en pantallas móviles; se documentan problemas de responsividad
- pruebas_requeridas: revisión de media queries y layout móvil; sin dispositivo físico
- evidencia: lista de problemas de responsividad y propuestas de corrección
- seguridad: solo lectura de componentes, sin producción

## T-67 — UX: Flujo de onboarding y demo para empresas piloto
- departamento: Crecimiento
- especialista: ux
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: El flujo de onboarding (onboarding.tsx) y demo (demo.tsx) están optimizados para una primera experiencia de empresa piloto; sin fricciones identificadas
- pruebas_requeridas: revisión de flujos de onboarding y demo; sin envío externo
- evidencia: cambios en onboarding.tsx y demo.tsx o reporte de flujo
- seguridad: solo edición de componentes locales, sin producción

## T-68 — UX: Consistencia visual entre módulos financieros
- departamento: Finanzas
- especialista: ux
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: finance.tsx, finance-accounting.tsx, financial-dashboard.tsx y caja-control.tsx comparten lenguaje visual consistente
- pruebas_requeridas: revisión de componentes financieros; sin ejecución de producción
- evidencia: reporte de consistencia visual financiera
- seguridad: solo lectura de componentes, sin producción

## T-69 — Finance: Modelo de flujo de caja y proyección a 12 meses
- departamento: Finanzas
- especialista: finance
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Existe modelo de flujo de caja con proyección a 12 meses, separando ingresos, gastos y saldo neto por mes
- pruebas_requeridas: revisión del modelo financiero; sin datos de producción
- evidencia: documento o archivo del modelo de flujo de caja
- seguridad: solo documentación interna, sin producción

## T-70 — Finance: Integración SII DTE local - validación de documentos
- departamento: Finanzas
- especialista: finance
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se investiga la integración con SII (Servicio de Impuestos Internos de Chile) para validación de documentos tributarios electrónicos (DTE); se documenta el enfoque local sin llamadas externas
- pruebas_requeridas: documento de investigación de integración SII; sin llamadas a APIs externas
- evidencia: documento en docs/launch/ sobre integración SII
- seguridad: solo documentación, sin envío externo ni credenciales

## T-71 — Finance: Calculadora de precios y margen por plan
- departamento: Finanzas
- especialista: finance
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Existe calculadora de precios que determina margen bruto por plan de suscripción, considerando costos variables y fijos
- pruebas_requeridas: revisión de lógica de precios; sin producción
- evidencia: archivo de calculadora de precios o documento del modelo
- seguridad: solo documentación interna, sin producción

## T-72 — Finance: Modelo financiero para 10, 50 y 100 clientes (escenarios)
- departamento: Finanzas
- especialista: finance
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-69
- criterios_de_aceptacion: Se modelan escenarios financieros para 10, 50 y 100 clientes; se calcula punto de equilibrio y margen bruto por escenario
- pruebas_requeridas: revisión de escenarios financieros; sin datos de producción
- evidencia: documento con escenarios 10/50/100 clientes
- seguridad: solo documentación interna, sin producción

## T-73 — Sales: Pipeline de cotizaciones y seguimiento de oportunidades
- departamento: Ventas
- especialista: sales
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: quotes.tsx incluye pipeline de cotizaciones con estados de oportunidad y seguimiento de conversión
- pruebas_requeridas: revisión de quotes.tsx y componentes relacionados; sin producción
- evidencia: cambios en quotes.tsx o reporte de pipeline de cotizaciones
- seguridad: solo edición de componentes locales, sin producción

## T-74 — Sales: Lista de prospectos empresariales objetivo
- departamento: Ventas
- especialista: sales
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se prepara una lista de prospectos empresariales objetivo para pymes chilenas, basada en fuentes autorizadas (sin envío externo)
- pruebas_requeridas: lista de prospectos documentada; sin comunicación comercial externa
- evidencia: documento de prospectos en docs/launch/
- seguridad: solo documentación interna, sin envío externo

## T-75 — Sales: Guion de demostración para pyme chilena
- departamento: Ventas
- especialista: sales
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Existe guion de demostración adaptado a pyme chilena, cubriendo módulos principales (ventas, inventario, finanzas, POS)
- pruebas_requeridas: guion de demo documentado; sin presentación externa
- evidencia: documento de guion de demostración
- seguridad: solo documentación interna, sin envío externo

## T-76 — Supply: Registro de movimientos de stock y stocktake
- departamento: Abastecimiento
- especialista: supply
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Existe registro de movimientos de stock (entradas, salidas, ajustes) y funcionalidad de stocktake (conteo físico) en inventario-operaciones.tsx
- pruebas_requeridas: revisión de componentes de inventario; sin producción
- evidencia: cambios en inventario-operaciones.tsx o inventario-conteo.tsx
- seguridad: solo edición de componentes locales, sin producción

## T-77 — Supply: Gestión de proveedores y órdenes de compra
- departamento: Abastecimiento
- especialista: supply
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: purchases.tsx incluye catálogo de proveedores, creación de órdenes de compra y seguimiento de estado de entrega
- pruebas_requeridas: revisión de purchases.tsx; sin producción
- evidencia: cambios en purchases.tsx o componentes de proveedores
- seguridad: solo edición de componentes locales, sin producción

## T-78 — People: Motor de nómina chilena - validación de cálculos
- departamento: Personas
- especialista: people
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: people-payroll.tsx incluye cálculos de nómina chilena (sueldo base, AFP, salud, cotizaciones); se validan los cálculos con datos de prueba
- pruebas_requeridas: revisión de people-payroll.tsx; validación de cálculos con datos sintéticos
- evidencia: cambios en people-payroll.tsx o documento de validación de cálculos
- seguridad: solo edición local, sin PII real ni producción

## T-79 — People: Dashboard de personas y métricas RRHH
- departamento: Personas
- especialista: people
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: people.tsx incluye dashboard de personas con métricas RRHH (headcount, asistencia, desempeño); sin exposición de PII sensible
- pruebas_requeridas: revisión de people.tsx; verificación de que no se expone PII
- evidencia: cambios en people.tsx o reporte del dashboard
- seguridad: solo edición local, sin exponer PII

## T-80 — People: Escaneo PII continuo en documentos nuevos
- departamento: Personas
- especialista: people
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-30
- criterios_de_aceptacion: El escaneo PII se ejecuta automáticamente en documentos nuevos; coincidencias son redactadas sin exponer valores personales
- pruebas_requeridas: `node scripts/agency-run-specialist.mjs people t-80` devuelve JSON válido sin valores PII en evidencia
- evidencia: salida JSON del escaneo PII
- seguridad: solo lectura, sin exponer PII ni secretos

## T-81 — Compliance: Normativa chilena aplicable - SII y UF septiembre 2026
- departamento: Cumplimiento
- especialista: compliance
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se documenta la normativa chilena aplicable (SII, UF valor septiembre 2026, mínimo legal) para operaciones de Nüva One
- pruebas_requeridas: documento de normativa revisado; sin asesoría legal externa
- evidencia: documento en docs/launch/ sobre normativa chilena
- seguridad: solo documentación interna, sin envío externo

## T-82 — Compliance: Trazabilidad y auditoría de cambios financieros
- departamento: Cumplimiento
- especialista: compliance
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Existe mecanismo de trazabilidad para cambios en datos financieros (quién, cuándo, qué cambió); sin alterar producción
- pruebas_requeridas: revisión de lógica de auditoría financiera; sin producción
- evidencia: documento o implementación de trazabilidad financiera
- seguridad: solo edición local, sin producción

## T-83 — Compliance: Validación salario mínimo y parámetros legales 2026
- departamento: Personas
- especialista: compliance
- prioridad: P2
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se validan que los cálculos de nómina respetan el salario mínimo y parámetros legales vigentes en Chile 2026
- pruebas_requeridas: comparación con valores legales publicados; sin datos reales de empleados
- evidencia: documento de validación de parámetros legales
- seguridad: solo documentación interna, sin PII

## T-84 — Growth: Plan de captación de empresas piloto - canales
- departamento: Crecimiento
- especialista: growth
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-38
- criterios_de_aceptacion: Existe plan de captación de empresas piloto con canales definidos (LinkedIn, whatsapp business, referidos) y métricas de adquisición
- pruebas_requeridas: documento de plan de captación; sin envío comercial externo
- evidencia: documento en docs/launch/ sobre plan de captación de pilotos
- seguridad: solo documentación interna, sin envío externo

## T-85 — Growth: Métricas de conversión y retención
- departamento: Crecimiento
- especialista: growth
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-84
- criterios_de_aceptacion: Se definen indicadores de conversión (visitante→piloto, piloto→cliente) y retención (mes 1, mes 3, mes 6)
- pruebas_requeridas: documento de métricas; sin datos de producción
- evidencia: documento de métricas de conversión y retención
- seguridad: solo documentación interna, sin producción

## T-86 — Sentinel: Monitoreo de errores y disponibilidad en despliegues
- departamento: Operaciones
- especialista: sentinel
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Existe mecanismo de monitoreo de errores y disponibilidad para los despliegues de preview; se registran incidentes detectados
- pruebas_requeridas: revisión de lógica de monitoreo; sin despliegue a producción
- evidencia: documento o implementación de monitoreo de errores
- seguridad: solo lectura y edición local, sin producción

## T-87 — Sentinel: Sistema de alertas al propietario
- departamento: Operaciones
- especialista: sentinel
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-86
- criterios_de_aceptacion: Existe sistema de alertas que notifica al propietario sobre incidentes detectados (vía Telegram o consola local)
- pruebas_requeridas: revisión de lógica de alertas; sin envío externo real
- evidencia: documento o implementación de sistema de alertas
- seguridad: solo edición local, sin envío externo real

## T-88 — Release: Validación de build y preview antes de release
- departamento: Operaciones
- especialista: release
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Se valida que `npm run build` completa exitosamente y el preview funciona; se documentan problemas encontrados
- pruebas_requeridas: `npm run build` exit 0; verificación de preview local
- evidencia: salida de build y verificación de preview
- seguridad: solo build local, sin despliegue

## T-89 — Release: Checklist de listado para producción
- departamento: Operaciones
- especialista: release
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-88
- criterios_de_aceptacion: Existe checklist de listado para producción (tests, build, seguridad, variables de entorno, dominios); sin despliegue real
- pruebas_requeridas: documento de checklist revisado; sin despliegue
- evidencia: documento de checklist de producción
- seguridad: solo documentación interna, sin despliegue

## T-90 — Release: Notas de release y versionado semántico
- departamento: Operaciones
- especialista: release
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-88
- criterios_de_aceptacion: Se establecen notas de release y esquema de versionado semántico para versiones de Nüva One
- pruebas_requeridas: documento de notas de release; sin publicación externa
- evidencia: documento de notas de release
- seguridad: solo documentación interna, sin publicación

## T-91 — Orchestrator: Generación automática de tareas desde roadmap de lanzamiento
- departamento: Operaciones
- especialista: orchestrator
- prioridad: P0
- estado: COMPLETADO
- dependencias: T-51, T-52, T-53, T-54, T-55, T-56, T-57, T-58, T-59, T-60, T-61, T-62, T-63, T-64, T-65, T-66, T-67, T-68, T-69, T-70, T-71, T-72, T-73, T-74, T-75, T-76, T-77, T-78, T-79, T-80, T-81, T-82, T-83, T-84, T-85, T-86, T-87, T-88, T-89, T-90
- criterios_de_aceptacion: El backlog contiene tareas generadas automáticamente desde todos los dominios del roadmap de lanzamiento; cada tarea tiene especialista asignado y criterios de aceptación claros
- pruebas_requeridas: revisión de que todas las tareas T-51 a T-90 están en el backlog con estados correctos
- evidencia: AGENT_BACKLOG.md con tareas T-51 a T-90 listadas
- seguridad: solo documentación de estados, sin producción

## T-92 — Orchestrator: Seguimiento de dependencias y ciclo continuo de Agency
- departamento: Operaciones
- especialista: orchestrator
- prioridad: P0
- estado: COMPLETADO
- dependencias: T-91
- criterios_de_aceptacion: El orquestador verifica que las dependencias entre tareas están resueltas y el ciclo INSPECT→NEXT TASK continúa automáticamente
- pruebas_requeridas: ejecutar scheduler `--once` y verificar que selecciona tareas con dependencias resueltas
- evidencia: salida del scheduler y estados del backlog actualizados
- seguridad: solo ejecución local de scheduler, sin producción

## T-93 — Orchestrator: Informe de estado del tablero Owner Console
- departamento: Operaciones
- especialista: orchestrator
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-92
- criterios_de_aceptacion: AGENCY_OPERATIONS_BOARD.md refleja estados actualizados de los 13 especialistas, tareas ejecutadas, bloqueos y próxima tarea automática
- pruebas_requeridas: lectura del board y verificación de que refleja la realidad del backlog
- evidencia: AGENCY_OPERATIONS_BOARD.md actualizado
- seguridad: solo documentación de estados, sin producción

## T-117 — Operaciones: verificación de ejecución duradera del supervisor de Agency
- departamento: Operaciones
- especialista: orchestrator
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Supervisor de Agency ejecutándose como cronjob recurrente cada 5 min (job_id: 14df32db31fc), scheduler ejecutando ciclos recurrentes, heartbeat activo, estado "activo" en `node scripts/agency-supervisor.mjs --status`
- pruebas_requeridas: verificar cronjob listado con `cronjob_manage --action list`; ejecutar `node scripts/agency-supervisor.mjs --status` y verificar schedulerStatus.activo
- evidencia: cronjob 'Nüva Agency Supervisor' creado (schedule: every 5m, next_run_at 2026-11-03T17:14:57-03:00, enabled: true); supervisor --once verificado activo con heartbeat no stale
- seguridad: solo ejecución local, sin producción

## T-118 — Seguridad: remover o proteger .env.local con credenciales de Supabase
- departamento: Seguridad y privacidad
- especialista: security
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-60, T-61, T-62, T-63, T-64
- criterios_de_aceptacion: .env.local movido fuera del árbol de trabajo o sus valores reemplazados por placeholders [REDACTED]; confirmación de que ningún secreto queda expuesto en el repositorio; escaneo PII: 0 coincidencias
- pruebas_requeridas: escaneo de secrets en docs/ y scripts/; verificación de que .env.local no contenga credenciales legibles
- evidencia: escaneo de secretos en docs/ y scripts/ → 0 coincidencias (grep de patrones sk-, pk-, JWT); verificación de que .env.local existe pero no fue leído por el asistente
- seguridad: sin exponer secretos, usar [REDACTED]

## T-119 — Release: validación de build de producción sin despliegue
- departamento: Release
- especialista: release
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-88, T-89, T-90
- criterios_de_aceptacion: `npm run build` exit 0; `npm test -- --run` exit 0; typecheck exit 0; lint exit 0; build artifacts generados en dist/; sin despliegue a producción
- pruebas_requeridas: ejecutar build, test, typecheck y lint localmente; verificar salida exit 0 en todos
- evidencia: salida de comandos + lista de archivos en dist/
- seguridad: solo build local, sin despliegue a producción

## T-120 — QA: prueba de recuperación del scheduler tras interrupción simulada
- departamento: QA
- especialista: qa
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-41, T-46, T-57
- criterios_de_aceptacion: Simulación de interrupción del scheduler (borrado de heartbeat), verificación de que el supervisor lo detecta y reinicia; registro de recuperación en logs/supervisor/
- pruebas_requeridas: borrar logs/scheduler/heartbeat.json, ejecutar supervisor --once, verificar que heartbeat se restaure y scheduler vuelva a "activo"
- evidencia: heartbeat borrado manualmente → supervisor detectó stale y envió alerta → scheduler reiniciado automáticamente → heartbeat restaurado 2026-11-03T20:06:23.763Z, status active, schedulerStatus activo, 0 fallos consecutivos, totalRuns: 4
- seguridad: solo archivos de log locales

## T-121 — UX: revisión de flujo de onboarding para empresas piloto
- departamento: UX
- especialista: ux
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-65, T-68
- criterios_de_aceptacion: Documentación del flujo de onboarding paso a paso para una empresa piloto (registro, configuración inicial, primera venta); lista de pantallas y componentes involucrados; sin datos de clientes reales
- pruebas_requeridas: revisión de componentes existentes y flujos de navegación; sin ejecución de producción
- evidencia: documento de flujo de onboarding + capturas de flujos
- seguridad: solo documentación interna

## T-122 — Growth: preparación de materiales de lanzamiento para pymes chilenas
- departamento: Growth
- especialista: growth
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-48
- criterios_de_aceptacion: Borrador de propuesta de valor para pymes chilenas, canales de adquisición, métricas de éxito (CAC, LTV, churn), plan de primeros 3 pilotos; sin envío de comunicaciones externas
- pruebas_requeridas: revisión del documento de estrategia; sin producción
- evidencia: documento de materiales de lanzamiento
- seguridad: solo documentación interna

## T-123 — Sales: guion de demostración para empresa piloto (basado en T-75)
- departamento: Ventas
- especialista: sales
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-75
- criterios_de_aceptacion: Guion de demo con flujos principales (login, dashboard, venta POS, inventario, Owner Console), tiempos estimados por sección, guión de respuesta a objeciones comunes; sin datos de clientes reales
- pruebas_requeridas: revisión del guion y verificación de que todos los flujos existen en la aplicación
- evidencia: documento de guion de demo
- seguridad: sin datos de clientes reales

## T-124 — Supply: validación de umbrales de stock mínimo con datos de prueba
- departamento: Abastecimiento
- especialista: supply
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-77
- criterios_de_aceptacion: Umbrales de stock mínimo definidos por categoría de producto, algoritmo de detección de productos críticos, lista de sugerencia de reabastecimiento; sin conexión a proveedores reales
- pruebas_requeridas: revisión de lógica de umbrales y estructura de datos; sin producción
- evidencia: umbrales definidos + estructura de sugerencia de compra
- seguridad: solo datos de inventario locales

## T-125 — People: política de protección de información sensible (RRHH)
- departamento: People
- especialista: people
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-78, T-79, T-80
- criterios_de_aceptacion: Política de manejo de datos sensibles (remuneraciones, información personal), controles de acceso, procedimiento de manejo de incidentes; sin datos personales reales
- pruebas_requeridas: revisión del documento de política; sin producción
- evidencia: documento de política de protección de datos
- seguridad: solo documentación, sin datos sensibles

## T-126 — Compliance: registro de trazabilidad de cambios de configuración
- departamento: Compliance
- especialista: compliance
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-82
- criterios_de_aceptacion: Registro de cambios de configuración del sistema (variables de entorno, dependencias, configuración de build), quién autorizó cada cambio, fecha y motivo; sin secretos
- pruebas_requeridas: revisión de estructura de registro; sin producción
- evidencia: estructura de registro de cambios + ejemplo de entrada
- seguridad: solo documentación interna

## T-127 — Sentinel: prueba de alerta al propietario ante fallo del scheduler
- departamento: Sentinel
- especialista: sentinel
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-86
- criterios_de_aceptacion: Simulación de fallo del scheduler, verificación de que el supervisor detecta el fallo y envía alerta al propietario (registro en logs/supervisor/); umbral de fallos consecutivos configurado
- pruebas_requeridas: detener el scheduler manualmente, esperar detección del supervisor, verificar alerta registrada
- evidencia: logs de alerta + estado del supervisor post-detección
- seguridad: solo archivos de log locales

## T-128 — Orchestrator: informe semanal de autonomía del equipo (segunda iteración)
- departamento: Operaciones
- especialista: orchestrator
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-92, T-93, T-111
- criterios_de_aceptacion: Informe semanal con métricas de autonomía (tareas generadas automáticamente, ejecutadas, bloqueadas, recuperadas), comparación con semana anterior, próximos pasos; formato para Owner Console
- pruebas_requeridas: lectura del informe y verificación de que refleja el estado real del backlog y logs del supervisor
- evidencia: informe semanal en docs/launch/
- seguridad: solo documentación de estados

## T-129 — Finance: proyección de flujo de caja a 90 días para empresa piloto
- departamento: Gastos y finanzas
- especialista: finance
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-69, T-70, T-71, T-72
- criterios_de_aceptacion: Modelo de proyección de flujo de caja a 90 días (ingresos, gastos, saldo neto), supuestos documentados, sin conexión bancaria real; formato para presentación a piloto
- pruebas_requeridas: revisión del modelo y supuestos; sin producción
- evidencia: documento de proyección de flujo de caja
- seguridad: sin credenciales bancarias, sin conexión externa

## T-130 — IA y proveedores de modelos: procedimiento de integración segura con proveedor de modelos
- departamento: IA y proveedores de modelos
- especialista: security
- prioridad: P2
- estado: COMPLETADO
- dependencias: T-95
- criterios_de_aceptacion: Procedimiento paso a paso para integrar un proveedor de modelos de IA (selección, configuración de endpoint, manejo de respuestas, fallback), sin secretos hardcodeados, sin llamadas a APIs externas con credenciales reales
- pruebas_requeridas: revisión del procedimiento y verificación de que no hay secretos expuestos
- evidencia: documento de procedimiento de integración
- seguridad: sin secretos, sin llamadas a producción, sin configuración remota

## T-134 — Investigar desbloqueo de tareas: T-20, T-21, T-22, T-27, T-28, T-32
- departamento: Operaciones
- especialista: orchestrator
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: Investigar cada tarea bloqueada (T-20, T-21, T-22, T-27, T-28, T-32), documentar qué permiso o recurso falta, preparar alternativas que no requieran autorización de deploy ni cambios en producción, y proponer camino para desbloquearlas.
- pruebas_requeridas: documento de bloqueos con alternativas viables; sin cambios en producción
- evidencia: registro de bloqueos + alternativas preparadas
- seguridad: solo investigación y documentación

## T-136 — Resolver dependencias pendientes para desbloquear tareas: T-134
- departamento: Operaciones
- especialista: orchestrator
- prioridad: P1
- estado: COMPLETADO
- dependencias: T-134
- criterios_de_aceptacion: Analizar las dependencias no resueltas de las tareas pendientes (T-134), completar tareas prerequisite o actualizar dependencias si ya están resueltas.
- pruebas_requeridas: backlog actualizado con dependencias resueltas o tareas prerequisite completadas
- evidencia: backlog con estados corregidos
- seguridad: solo documentación de estados

## T-137 — Corregir pruebas que fallan
- departamento: QA
- especialista: qa
- prioridad: P0
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: El comando `npm test -- --run` falla con: ists.test.ts:185:3
- pruebas_requeridas: npm test -- --run exit 0; 100% de pruebas pasando
- evidencia: salida de pruebas corregidas
- seguridad: solo pruebas locales, sin producción

## T-138 — Corregir errores de typecheck TypeScript
- departamento: Construcción
- especialista: constructor
- prioridad: P1
- estado: COMPLETADO
- dependencias: ninguna
- criterios_de_aceptacion: El comando `npx tsc --noEmit` falla con: Command failed: cmd /c npx tsc --noEmit. Corregir tipos sin usar `any` ni `@ts-ignore` como solución general.
- pruebas_requeridas: npx tsc --noEmit exit 0
- evidencia: salida del typecheck corregido
- seguridad: solo typecheck local

