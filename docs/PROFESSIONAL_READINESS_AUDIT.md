# Nüva One — Auditoría de preparación profesional

- **Fecha de corte:** 2026-10-09
- **Rama base observada:** `main`
- **Objetivo:** preparar una transición controlada desde el desarrollo de funcionalidades hacia una etapa profesional centrada en fiabilidad, seguridad, producto, operación y crecimiento.
- **Estado global:** **NO CERTIFICADO**. Hay evidencia positiva, pero aún no se han satisfecho ni verificado todos los criterios C1–C5.
- **Regla de evidencia:** `UNKNOWN`, `WARN` y `FAIL` nunca cuentan como `PASS`. No calcular un porcentaje global que mezcle implementación, certificación, salud de proveedores y preparación de release.

## 1. Resumen ejecutivo

### Evidencia positiva observada

1. Supabase informa el proyecto `vnzyecnbdqbfuxawzrda` como `ACTIVE_HEALTHY`, con PostgreSQL 17.6.1.104.
2. Vercel informa un deployment de producción `READY` del proyecto `nuva-one`, desde `main`, commit `89c232d9a4d5725dc4974b3c3ac79951e81372b3` (`fix(agency): do not block workers on cancelled CI runs`). Los alias incluyen `nuva-one.vercel.app`.
3. La función `public.nuva_core_integrity_audit()` se ejecutó y devolvió cero hallazgos en los 11 controles consultados: ventas sin transacción, ventas pagadas sin stock, ventas/compras con contabilidad pendiente, recepciones sin movimiento de inventario, líneas contables huérfanas, asientos descuadrados, movimientos de inventario/caja huérfanos, resultados de acciones huérfanos y riesgos críticos sin acción.
4. Las ejecuciones recientes consultadas de GitHub Actions incluyen ejecuciones satisfactorias de Web QA, Operational Metrics, Autonomous Agency Workers, Durable Agent Worker, Production Watch, Autonomous Repair Worker, Independent Safety Verification, Sentinel y Health Auditor. Esto es evidencia de ejecuciones individuales, no certificación completa del sistema.
5. El repositorio ya define comandos de verificación en `package.json`: `lint`, `typecheck`, `test`, `verify:migrations`, `agency:qa`, `agency:certify`, `agency:gateway` y `agency:dependency-audit`.
6. Existe una matriz de certificación independiente en `docs/nuva-agency/CERTIFICATION_MATRIX.md` y un backlog operativo en `docs/AGENT_BACKLOG.md`.

### Hallazgos que requieren trabajo

| ID | Severidad provisional | Hallazgo observado | Próxima acción segura | Criterio de cierre |
|---|---|---|---|---|
| SEC-01 | Alta / P1 | Supabase Auth reporta deshabilitada la protección de contraseñas filtradas. | Confirmar compatibilidad con el flujo de autenticación; habilitar desde la configuración de Auth y probar registro/cambio de contraseña. | Configuración verificada y pruebas de autenticación aprobadas. |
| SEC-02 | P1, sujeto a verificación | El asesor de Supabase reporta seis tablas Agency con RLS activo y sin políticas explícitas: `agency_agent_leases`, `agency_approvals`, `agency_artifacts`, `agency_events`, `agency_missions`, `agency_tasks`. | Inspeccionar grants, roles consumidores, políticas, funciones privilegiadas y pruebas de acceso por propietario/no propietario. No abrir acceso para eliminar el aviso. | Acceso mínimo necesario documentado y pruebas negativas/positivas de autorización pasando. |
| PERF-01 | P2 | Cuatro claves foráneas sin índice de cobertura en `agency_approvals`, `agency_artifacts` y `agency_tasks`. | Revisar columnas, cardinalidad y planes de consulta; preparar migración reversible si los índices son útiles. | Planes antes/después y pruebas de regresión satisfactorias. |
| PERF-02 | P2 | Tres políticas de `ops_agent_learning` reevalúan funciones de autenticación por fila. | Revisar las expresiones y cambiar a evaluación estable por sentencia cuando corresponda. | Pruebas de RLS conservadas y comparación de planes/resultados. |
| PERF-03 | Investigación | El linter informa 197 índices sin uso observado. | No eliminarlos en bloque. Cruzar telemetría, consultas de baja frecuencia, constraints, ventanas de observación y planes antes de proponer cambios. | Cada eliminación propuesta cuenta con justificación, evidencia y rollback. |
| AI-01 | P1 | PR #154 para certificación en vivo de Gemini, Groq y Cloudflare Workers AI está abierto y la integración reportó `mergeable: false`. | Inspeccionar checks, conflictos y ejecución del workflow; ejecutar certificación por proveedor y fallback sin exponer secretos. | Conflictos resueltos, checks requeridos en verde y evidencia por proveedor; fallback determinista no se cuenta como proveedor IA. |
| OPS-01 | P1 | La API de GitHub devolvió 403 al consultar branch protection para `main`. | Revisar la protección de rama desde una conexión con permisos adecuados o desde GitHub Settings. | Reglas documentadas para PR, CI, revisión, restricciones de push y bypass. |
| OBS-01 | P1 | Una consulta de agregación de logs falló con error del backend; no se obtuvieron métricas válidas de las últimas 24 horas en esa consulta. | Reintentar con una consulta soportada y revisar logs de Edge Functions, Postgres, PostgREST y runtime. | Informe de errores con ventana temporal, severidad y referencias verificables. |
| QA-01 | P1 | No se ejecutó en esta auditoría la batería completa local/CI ni una simulación end-to-end de todos los módulos. | Ejecutar scripts existentes en CI y ampliar pruebas de negocio por flujo crítico. | Artefactos y resultados actuales por criterio C1–C3. |
| UX-01 | P1 | No se completó una inspección manual/automatizada de todas las rutas, dispositivos y estados de interfaz. | Generar inventario de rutas y cobertura de loading/empty/error, teclado, accesibilidad y responsive. | Rutas críticas probadas; defectos bloqueantes corregidos o registrados. |

Las severidades son prioridades de trabajo iniciales, no una declaración de explotabilidad. La clasificación final depende de contexto, exposición, permisos y evidencia de impacto.

## 2. Inventario de estado GitHub y producción

- Deployment consultado: `nuva-2opdzxa8l-martinaburtoe.vercel.app`, estado `READY`, target `production`, commit `89c232d9a4d5725dc4974b3c3ac79951e81372b3`.
- El deployment tenía alias `nuva-one.vercel.app`, `nuva-one-martinaburtoe.vercel.app` y `nuva-one-git-main-martinaburtoe.vercel.app`.
- En la consulta de PR abiertos, solo apareció PR #154. Volver a consultar antes de actuar: el inventario cambia continuamente.
- La API devolvió una lista de ejecuciones recientes con varios workflows en `success`; un workflow Telegram Reporter apareció como `skipped` bajo el evento `workflow_run`. Un `skipped` no debe marcarse como fallo sin comprobar sus condiciones, y tampoco como certificación.
- No se pudo leer la configuración de protección de rama debido a permisos insuficientes de la integración. El estado de protección queda `UNKNOWN`, no `PASS`.

## 3. Plan de preparación por puertas de salida

### Puerta A — Seguridad y control de cambios

- [ ] Revisar Auth, MFA según riesgo, recuperación de cuenta, protección de contraseñas filtradas y sesiones.
- [ ] Auditar RLS por tabla y tenant; revisar grants, vistas, RPC, triggers y funciones `SECURITY DEFINER`.
- [ ] Probar aislamiento multi-tenant con al menos dos empresas y roles diferentes.
- [ ] Verificar que Telegram y el panel de Agency sean exclusivos del propietario autorizado.
- [ ] Confirmar ausencia de secretos en logs, artefactos, errores, commits y respuestas API.
- [ ] Revisar branch protection/rulesets y requisitos de checks mediante acceso autorizado.
- [ ] Revisar dependencias con `npm run agency:dependency-audit`; priorizar explotabilidad y rutas de ejecución.

**Salida:** cero vulnerabilidades críticas/altas sin mitigación aceptada; autorización positiva y negativa probada; cambios de producción sujetos a CI, revisión y rollback.

### Puerta B — Integridad técnica

- [ ] Ejecutar `npm ci` en entorno limpio.
- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar `npm run typecheck`.
- [ ] Ejecutar `npm test` y revisar cobertura relevante.
- [ ] Ejecutar `npm run build`.
- [ ] Ejecutar `npm run verify:migrations`.
- [ ] Revisar errores de consola, dependencias, rutas y configuración de entorno.
- [ ] Registrar commit, fecha, workflow URL, conclusión y artefactos.

**Salida:** resultados actuales y reproducibles en CI; ninguna regresión introducida por los cambios.

### Puerta C — Flujos de negocio críticos

Validar la cadena: tenant → clientes → productos → compras → recepción → inventario → venta → pago → caja/finanzas → contabilidad → Nüva Intelligence → Action Queue → outcome → reportes.

- [ ] Caso feliz con datos de prueba aislados.
- [ ] Duplicación/idempotencia de solicitudes y webhooks.
- [ ] Concurrencia de stock y venta; ausencia de overselling.
- [ ] Fallos intermedios, reintentos, compensaciones y reversas.
- [ ] Cuadre contable, caja e inventario después de cada escenario.
- [ ] Permisos por rol y empresa en cada endpoint crítico.
- [ ] Ejecutar simulación golden de negocio y guardar resultados.

**Salida:** invariantes verificadas, sin corrupción de datos ni dobles contabilizaciones.

### Puerta D — Experiencia y producto

- [ ] Inventariar rutas/pantallas desde el router real.
- [ ] Probar navegación, búsqueda, CTAs y formularios.
- [ ] Probar estados de carga, vacío, error, reintento y éxito.
- [ ] Revisar responsive en móvil, tablet y desktop.
- [ ] Revisar accesibilidad por teclado, foco, etiquetas, contraste y semántica.
- [ ] Verificar mensajes y formatos chilenos donde corresponda (CLP, fechas, impuestos).
- [ ] Documentar defectos visuales y funcionales con pasos de reproducción.

**Salida:** todas las rutas críticas cubiertas; ningún defecto bloqueante de UX abierto sin excepción documentada.

### Puerta E — Operación y producción

- [ ] Confirmar smoke tests contra el dominio de producción y rutas autenticadas de forma segura.
- [ ] Consultar logs de Vercel, Supabase, Postgres, PostgREST y Edge Functions.
- [ ] Establecer objetivos de latencia/error por operación crítica.
- [ ] Probar límites, timeouts, reintentos y degradación de proveedores IA.
- [ ] Confirmar copias de seguridad y ejecutar prueba de restauración en entorno seguro.
- [ ] Probar rollback de deployment y procedimiento de migración compatible.
- [ ] Confirmar alertas accionables, responsables y guía de respuesta a incidentes.

**Salida:** runbook operativo, observabilidad utilizable y recuperación demostrada.

### Puerta F — Agencia y release

- [ ] Verificar cada uno de los 13 roles con tarea, resultado y evidencia persistida.
- [ ] Confirmar que el worker continúa tareas tras fallos transitorios y no informa falsos PASS.
- [ ] Validar persistencia de auditorías y eventos, deduplicación y manejo de permisos.
- [ ] Certificar Gemini, Groq y Cloudflare por separado cuando estén configurados; identificar modelo y timestamp, nunca imprimir secretos.
- [ ] Probar fallback forzado y distinguir proveedor IA de fallback determinista.
- [ ] Confirmar que los agentes no fusionan/publican ante checks fallidos, conflictos o hallazgos críticos.
- [ ] Obtener verificación independiente del agente implementador.
- [ ] Generar release evidence y matriz C1–C5 con referencias de ejecución.

**Salida:** release readiness solo puede ser `READY` con criterios obligatorios en `PASS`, evidencia vigente y sin bloqueos críticos/altos abiertos.

## 4. Secuencia de ejecución recomendada

1. **Primero:** inspeccionar PR #154, estado actual de checks y workflow de gateway. No fusionar por conveniencia.
2. **Segundo:** resolver la protección de contraseñas filtradas y auditar las seis tablas Agency con RLS.
3. **Tercero:** ejecutar C1 en CI limpio y guardar evidencia; corregir fallos reales antes de ampliar alcance.
4. **Cuarto:** correr la simulación golden end-to-end, pruebas de aislamiento multi-tenant y concurrencia.
5. **Quinto:** corregir hallazgos de rendimiento con mediciones y migraciones seguras.
6. **Sexto:** completar QA de UX/accesibilidad, observabilidad, recuperación y runbooks.
7. **Séptimo:** emitir la certificación C1–C5; solo después abrir la fase de potenciación profesional.

## 5. Reglas para evitar falsas certificaciones

- Nunca declarar el producto listo basándose únicamente en un deployment `READY` o workflows verdes.
- Nunca convertir ausencia de datos o permisos de lectura insuficientes en un resultado PASS.
- Nunca borrar avisos, eliminar índices o abrir políticas RLS solo para reducir el número de hallazgos.
- Nunca ejecutar cambios destructivos de producción sin migración revisada, backup/rollback y pruebas.
- Mantener separados: `implementation_percent`, `certification_percent`, `provider_health_percent` y `release_readiness`.
- Cada hallazgo debe tener propietario, severidad, evidencia, aceptación, estado y siguiente acción.
- Cerrar un hallazgo únicamente con evidencia posterior al cambio y pruebas de regresión.

## 6. Entregable para la siguiente fase profesional

Esta auditoría define la línea base y la secuencia de trabajo. La siguiente fase debe concentrarse en:

1. **Producto:** propuesta de valor, segmentos de clientes, onboarding, demo, activación y retención.
2. **Calidad:** criterios de aceptación por módulo y release gates automatizados.
3. **Operación:** observabilidad, incidentes, soporte, recuperación y SLA internos.
4. **Seguridad y cumplimiento:** privacidad, ciclo de vida de datos, trazabilidad y controles aplicables a Chile.
5. **Escalabilidad:** capacidad, coste por tenant, límites de uso, rendimiento y estrategia de soporte.
6. **Negocio:** planes/precios, facturación, métricas de activación, uso y conversión.

No iniciar esta potenciación como una expansión indiscriminada de funcionalidades. Utilizar los resultados de las puertas anteriores para priorizar las inversiones que más reduzcan riesgo y mejoren valor para clientes.

## 7. Evidencias y referencias

- Repositorio: https://github.com/martinaburtoe-art/nuva-one
- Matriz de certificación: https://github.com/martinaburtoe-art/nuva-one/blob/main/docs/nuva-agency/CERTIFICATION_MATRIX.md
- Backlog de ingeniería: https://github.com/martinaburtoe-art/nuva-one/blob/main/docs/AGENT_BACKLOG.md
- PR de gateway observado: https://github.com/martinaburtoe-art/nuva-one/pull/154
- Deployment observado: https://nuva-one.vercel.app/
- Supabase Auth: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase database linter: https://supabase.com/docs/guides/database/database-linter

**Nota de alcance:** esta es una auditoría inicial basada en la evidencia accesible al 2026-10-09. No equivale a una auditoría externa de penetración, una revisión legal ni a una certificación final de release.


## 7. Evidencia adicional de CI — 2026-10-09

La revisión del PR de esta auditoría activó comprobaciones que sí ejecutaron validaciones técnicas. Los resultados observados identifican bloqueos concretos:

- **C1 — TypeScript/build: FAIL.** `src/routes/api/owner/agency-control.ts` reportó errores TS2339: el resultado de autenticación puede representar al propietario (`userId`) o al worker (`agentId`), por lo que el código no puede acceder directamente a ambos campos en la unión de tipos.
- **C2 — PostgreSQL/pgTAP bootstrap: FAIL.** El arranque limpio de Supabase se detuvo al insertar en `accounting_accounts` por la FK `accounting_accounts_business_id_fkey` (SQLSTATE 23503). El log señala la migración de cuentas financieras demo; hay que comprobar la existencia del negocio de demostración y el orden/aislamiento del seed antes de cambiar migraciones históricas.
- **C5 — AI Gateway: WARN/FAIL parcial.** Gemini y Groq reportaron PASS en el chequeo consultado; Cloudflare reportó FAIL. El gateway completo no debe marcarse PASS.
- **Estado de corrección:** se abrió el PR [#195](https://github.com/martinaburtoe-art/nuva-one/pull/195) para resolver el error de tipos de autenticación. Sus checks están pendientes/en ejecución en el momento de esta actualización; todavía no se considera corregido hasta que finalicen y pasen.

Estos resultados prevalecen sobre cualquier expectativa previa: la auditoría es un artefacto de planificación y evidencia, no una certificación. El fallo de bootstrap debe resolverse en un cambio independiente y seguro, validado desde una base de datos limpia; no se debe modificar producción para hacer pasar CI.

## 8. Seguimiento de remediaciones — 2026-10-09

Se abrieron tres PR de remediación independientes para que cada cambio tenga CI y revisión propios:

- **[PR #195 — autenticación de la agencia](https://github.com/martinaburtoe-art/nuva-one/pull/195):** corrección de narrowing TypeScript. En la consulta más reciente, build, safety-gate, web-qa, production-smoke, repository integrity y review están en PASS; pgTAP sigue en ejecución. No fusionar hasta obtener resultado final de pgTAP.
- **[PR #196 — seed financiero demo](https://github.com/martinaburtoe-art/nuva-one/pull/196):** el seed histórico insertaba cuentas para un UUID fijo sin verificar que existiera el negocio demo, bloqueando un esquema limpio por FK. Se condicionó la inserción a que el negocio exista. CI está en ejecución; el cambio aún no está aprobado.
- **[PR #197 — índices FK de Agency](https://github.com/martinaburtoe-art/nuva-one/pull/197):** agrega índices en las cuatro columnas FK reportadas por el asesor de rendimiento. CI está en ejecución; aún no está aprobado.

### Revisión adicional de exposición de tablas Agency

La consulta de permisos en producción encontró RLS habilitado y sin políticas explícitas en las seis tablas señaladas por el asesor. En la consulta de grants realizada, los privilegios de tabla observados correspondían a postgres y ciertos privilegios de estructura a service_role; no se observaron grants de SELECT/INSERT/UPDATE/DELETE a anon ni authenticated. Por tanto, el aviso no demuestra por sí solo exposición directa al cliente. Queda pendiente revisar todas las rutas de acceso privilegiadas, funciones SECURITY DEFINER y uso de service_role; no se añadirán políticas client-side indiscriminadamente.

### Rendimiento y seguridad

- Se verificaron cuatro índices faltantes de claves foráneas y se propuso remediación en PR #197.
- El asesor aún informa protección de contraseña filtrada deshabilitada. No hay una herramienta de Auth settings disponible en esta conexión para cambiar ese ajuste de forma verificada; requiere activación en la configuración Auth de Supabase y comprobación posterior.
- El asesor reporta 197 índices no usados; no se eliminarán automáticamente. Hace falta medir ventana de observación y revisar impacto de cada índice antes de retirarlos.
- La alerta sobre evaluación de auth por fila en ops_agent_learning se contrastó con las expresiones de política actuales, que ya usan subconsultas SELECT auth.jwt(). Debe tratarse como posible alerta desactualizada hasta revalidar después de la próxima migración/actualización del asesor.

Los PR son propuestas de cambio; solo sus resultados finales de CI, revisión y pruebas de regresión pueden elevar el estado de cada control.

## 9. CI de remediación — actualización 2026-10-10

La revisión continuada produjo resultados más recientes y nuevas correcciones:

- **PR #196 — seed de cuentas demo + correcciones de lint:** [revisar PR](https://github.com/martinaburtoe-art/nuva-one/pull/196). El resultado anterior confirmó pgTAP PASS y build PASS, pero falló el workflow agregado de lint por dos errores `prefer-const`. Ambos se corrigieron en el head más reciente; una nueva ronda de CI está en ejecución. El estado final de esa ronda aún es pendiente.
- **PR #197 — índices FK:** [revisar PR](https://github.com/martinaburtoe-art/nuva-one/pull/197). Se actualizó con las mismas correcciones de lint y el arreglo de tipos/seed que necesita su rama. Debe volver a pasar CI completo antes de aceptar los índices.
- **PR #195 — narrowing de autenticación:** build, repository integrity, safety-gate, web QA y production smoke habían pasado; pgTAP falló en una ejecución anterior porque el seed de negocio/cuentas demo rompía el bootstrap limpio. El arreglo de seed se está validando de forma separada en PR #196.

### Bloqueo actual y siguiente criterio de cierre

No fusionar hasta que la última ronda de CI confirme todos los checks requeridos. La protección de contraseña filtrada de Supabase sigue pendiente porque la integración disponible permite consultar proyecto, SQL, migraciones y asesores, pero no modificar de forma verificada esa opción de Auth. Los 197 índices no usados continúan fuera de cualquier cambio automático. No se han aplicado migraciones ni cambios de datos a producción en esta ronda.


## Actualización de evidencia verificada — 2026-10-10

Esta sección sustituye cualquier estado temporal anterior sobre las mismas comprobaciones. No declara certificación global.

### Integración y CI

- PR #196 y PR #197 se integraron en `main` después de que sus respectivas ejecuciones de CI reportaran 10/10 checks aprobados.
- La ejecución de `live-certification` sobre `main` terminó en PASS. Su evidencia viva confirma Gemini PASS y Groq PASS; Cloudflare devuelve `cloudflare_account_ai_not_found`. El workflow deja Cloudflare como proveedor opcional, así que su fallo no invalida los dos proveedores certificados, pero sí impide declarar salud de los tres proveedores.
- La ejecución posterior a los merges tiene `build`, `Repository integrity`, `production-smoke` y `live-certification` en PASS. A la hora de esta actualización, pgTAP/reconstrucción de esquema, carga efímera 10/25/50/100 VU y rotación de agentes siguen `IN_PROGRESS`; no se cuentan como aprobados.

### Producción: integridad, rendimiento y permisos de Agency

- `public.nuva_core_integrity_audit()` se volvió a ejecutar en producción el 2026-10-10: 11 controles, cero fallos en todos los controles devueltos.
- Se añadieron los cuatro índices identificados por el asesor de rendimiento: `agency_approvals(mission_id)`, `agency_approvals(task_id)`, `agency_artifacts(mission_id)` y `agency_tasks(parent_task_id)`. La consulta posterior confirmó los cuatro índices presentes en producción. Los cambios están integrados en PR #197.
- El asesor de seguridad sigue listando seis tablas Agency con RLS activo y sin políticas. El hallazgo es INFO, no prueba por sí solo exposición: consulta directa de privilegios encontró cero grants DML a `anon` y `authenticated` en esas seis tablas.
- Se inspeccionaron las funciones privilegiadas `agency_claim_task`, `agency_finish_task` y `agency_heartbeat`: las tres tienen `SECURITY DEFINER`, fijan `search_path` a `public, pg_catalog` y permiten `EXECUTE` a `service_role`; los roles `anon` y `authenticated` no tienen `EXECUTE`. Esto respalda el aislamiento observado, pero no reemplaza pruebas de integración negativas y positivas de cada endpoint.
- El asesor de rendimiento ya no reporta las cuatro FK Agency como hallazgos. Sigue informando tres avisos `auth_rls_initplan` en `ops_agent_learning`; la inspección de `pg_policies` mostró las expresiones de `auth.jwt()` envueltas en `SELECT`, por lo que este aviso puede ser obsoleto. No se alteraron esas políticas sin una reproducción que justifique el cambio. Los 201 índices marcados como no usados no se borrarán automáticamente.

### Pendientes que siguen bloqueando una certificación completa

- Supabase Auth: `auth_leaked_password_protection` continúa en WARN. No se ha modificado porque las herramientas conectadas no exponen el ajuste de Auth; requiere habilitarse en la configuración de Supabase y validar el flujo.
- Cloudflare Workers AI: error de cuenta/modelo `cloudflare_account_ai_not_found`; revisar ID de cuenta, modelo y permisos del token.
- Reglas de protección de rama: `UNKNOWN` por permisos insuficientes para confirmar su configuración.
- Pruebas de recuperación, pgTAP, carga, rotación real de los agentes y pruebas end-to-end C1–C5 deben terminar y conservar evidencia actual.
- La matriz global no se considera READY mientras haya puertas obligatorias pendientes o UNKNOWN. El éxito de CI no se interpreta como certificación completa de UX, seguridad, todos los módulos ni operación 24/7.

### Corrección del estado anterior

Una nota previa decía que no se habían aplicado cambios de base de datos en producción. Esa afirmación dejó de ser válida al aplicar y verificar los cuatro índices FK indicados arriba. No se eliminaron datos ni índices existentes como parte de esta optimización.


### Evidencia de carga, aislamiento y recuperación — ejecución 2026-10-10

Fuente: [Free Beta Validation Lab, run 38020757646](https://github.com/martinaburtoe-art/nuva-one/actions/runs/38020757646) y [pgTAP database tests, run 38020757624](https://github.com/martinaburtoe-art/nuva-one/actions/runs/38020757624).

- **pgTAP:** PASS en el stack Supabase local efímero. La reconstrucción de esquema y el ejercicio de recuperación finalizaron con PASS.
- **Aislamiento entre tenants:** la sonda cross-tenant devolvió PASS, con cero filas visibles para el tenant secundario en la consulta protegida.
- **Carga sintética:** las fases de 10, 25, 50 y 100 usuarios virtuales, con 2 iteraciones por fase, terminaron con cero fallos de usuario y cero fallos de solicitud. Latencia p95 observada: 82 ms (10 VU), 68 ms (25 VU), 147 ms (50 VU) y 351 ms (100 VU); ninguna fase excedió el presupuesto de latencia configurado.
- **Concurrencia de inventario:** los commits exitosos coincidieron con los esperados en las fases ejecutadas (25/25, 50/50 y 52/52); fallos de transporte: 0. p95 reportado: 307 ms, 256 ms y 295 ms, respectivamente.
- **Alcance:** son pruebas sintéticas contra un stack Supabase efímero/local, no una prueba de carga de producción ni una garantía de capacidad real para 100 usuarios simultáneos sostenidos. La rotación de agentes sigue pendiente en la ejecución de CI observada y debe terminar antes de dar por certificada la operación autónoma.


### Hallazgo operativo de Agency — 2026-10-10

La inspección de solo lectura de `public.agency_tasks` y `public.agency_agent_leases` encontró **dos tareas `queued` con `attempt_count = max_attempts = 3`** (roles QA y People). El selector de `agency_claim_task` exige `attempt_count < max_attempts`, por lo que esas filas estaban encoladas pero no podían volver a ser reclamadas. También había una tarea Supply en ejecución en su tercer intento, con lease activo; no se intervino mientras el lease estaba vigente.

- Corrección propuesta en [PR #199](https://github.com/martinaburtoe-art/nuva-one/pull/199): al ejecutar recuperación de leases, convertir tareas expiradas que agotaron intentos —incluidas las que ya quedaron `queued` por una recuperación anterior— a `failed`, escribir `error.code=max_attempts_exhausted` y emitir el evento auditable `task.recovery_exhausted`. Las tareas con intentos restantes siguen reencolándose.
- La corrección aún no se considera integrada ni desplegada; está pendiente de CI y pgTAP. No se modificaron esas tareas en producción directamente.
- Este hallazgo bloquea la certificación de recuperación autónoma hasta que la corrección pase pruebas y la recuperación de producción se ejecute con trazabilidad y revisión segura.
