# Nüva Agency — revisión operativa y evidencia

**Fecha de corte:** 2026-11-04 09:49 CLST (12:49 UTC)  
**Repositorio:** `martinaburtoe-art/nuva-one`  
**`main` observado:** `b0e91154ac6611a0129f94b64e3aec3aaeb6a23c`  
**Supabase:** proyecto `vnzyecnbdqbfuxawzrda` (consultas exclusivamente `SELECT`)  
**Alcance:** auditoría read-only de Slack, GitHub Actions, PRs y estado de persistencia. Sin cambios en producción.

## Dictamen

**Nüva Agency no está cerrada.** Hay una prueba real de claim → ejecución → finish persistido para una tarea determinista, pero no hay integración Hermes demostrada. Los workers de IA observados siguen usando Gemini; el fallback Groq falló por límites de cuota. La cola mantiene una tarea QA en estado `running` con lease vencido.

## Evidencia nueva

### 1. Un ciclo durable sí terminó de extremo a extremo

- Workflow: [run 41795264466](https://github.com/martinaburtoe-art/nuva-one/actions/runs/41795264466), job `126457749562`.
- Especialista seleccionado: `sales`.
- Task: `7d29015e-1500-40eb-b6b1-4b0f2519013e`.
- Log del job: claim y ejecución completados; salida `verdict=WARN`, `taskStatus=completed`.
- Supabase confirmó `agency_tasks.status=completed`, `attempt_count=1`, `error=null`, y eventos `task.claimed` + `task.completed`.
- Lease del task: `released`; heartbeat y liberación registrados a las 07:52:40Z.
- Resumen guardado: `vercel.json`, `package.json` y `nuva-agency-worker-control/index.ts` legibles; Odoo no declarado; GTM/GA no declarado.

**Interpretación:** prueba válida del ciclo durable de control y persistencia para una tarea de solo lectura. No prueba que Hermes haya sido el modelo/runtime ni que se haya realizado una integración comercial.

Código observado en `main`:
- [`scripts/agency-durable-worker.mjs`](https://github.com/martinaburtoe-art/nuva-one/blob/main/scripts/agency-durable-worker.mjs), blob SHA `7b806aca016c49279fbb0e7a8240851da065b2ad`: ejecuta `SPECIALISTS[agentId](task)`, llama `finish_task` y exige `finished.ok === true`.
- [Workflow durable specialist](https://github.com/martinaburtoe-art/nuva-one/blob/main/.github/workflows/nuva-agency-durable-worker.yml), blob SHA `d83d6bf194233bda712fc7f0b9949120415ec546`: usa `GITHUB_TOKEN` y `/api/owner/agency-control`; no invoca Hermes.
- [`specialists.mjs`](https://github.com/martinaburtoe-art/nuva-one/blob/main/src/lib/agency/specialists.mjs), blob SHA `2d4ae957f22e633552d6f0aa2cf001a114ca548a`: el especialista sales inspecciona archivos localmente y no realiza llamadas a APIs comerciales.

### 2. Los workers de IA no están usando Hermes

- [Run 41812299814 — Autonomous Agency Workers](https://github.com/martinaburtoe-art/nuva-one/actions/runs/41812299814), job `126514283123`, concluyó `success`.
- El log declara `Gemini worker outcome: success`, `Groq fallback outcome: skipped`, y cuatro pases Gemini.
- La verificación de cambios terminó con **“No implementation produced”**; `Create autonomous PR` quedó `skipped`.
- El job informó 100 archivos de test y 444 tests PASS, y el build terminó dentro del job exitoso. Esto valida el código comprobado, no una entrega nueva.
- El workflow durable antiguo [`nuva-agent-durable-worker.yml`](https://github.com/martinaburtoe-art/nuva-one/blob/main/.github/workflows/nuva-agent-durable-worker.yml), SHA `7e3d1aeabb2bdfbd467e200ace2d06cbc606bc1a`, invoca explícitamente `google-github-actions/run-gemini-cli@v0.1.22`.

### 3. Fallos de proveedor y de recuperación

- [Run 41792326234](https://github.com/martinaburtoe-art/nuva-one/actions/runs/41792326234), job `126448323909`, terminó FAILURE.
- El fallback Groq recibió límites de 8.000 TPM y 200.000 TPD; después `finish_task` devolvió HTTP 502 con `"exp" claim timestamp check failed`.
- Consulta actual de `public.agency_tasks`: **4 completed, 12 failed, 9 queued, 1 running**.
- La única tarea `running` observada es QA `f9132296-c736-47c3-9a21-b5782a98c682`; su lease figura `active`, pero `expires_at=2026-11-04 08:29:46Z`, anterior a la hora de corte. Solo se encontró `task.claimed`, sin evento de finalización.
- La consulta de leases vigentes (`status='active' AND expires_at > now()`) no encontró leases; tampoco encontró duplicados vigentes por agente.

**Interpretación:** existe un registro de lease vencido que no ha sido reconciliado con el estado de la tarea. No se intentó recuperar ni modificar la tarea.

## Pull requests de estabilización

| PR | Estado observado | CI / riesgo |
|---|---|---|
| [#270](https://github.com/martinaburtoe-art/nuva-one/pull/270) | Open, no draft | pgTAP PASS; job principal falla en Unit tests; Build omitido. |
| [#271](https://github.com/martinaburtoe-art/nuva-one/pull/271) | Open, draft | Checks asociados reportan SUCCESS, pero GitHub devuelve `mergeable_state=dirty`; no integrable sin resolver conflicto. |
| [#272](https://github.com/martinaburtoe-art/nuva-one/pull/272) | Open, draft | Siete workflows asociados reportan SUCCESS; `mergeable_state=clean`. No está fusionado. |

Los PR #270 y #271 abordan el contrato de despacho del especialista; deben consolidarse/revisarse para evitar dos candidatos solapados. #272 aborda renovación OIDC y validación de `ok=true`. No se hizo merge ni se modificó ninguna rama existente durante esta auditoría.

## Hermes y Slack

En `#nuva-agency-bridge`, Hermes publicó señales de gateway online a las **00:01:06** y **00:11:44 CLST** del 4-nov, intercaladas con mensajes de apagado. En el hilo de cambio de mando no aparece una respuesta de tarea de Hermes ni evidencia de subagentes posterior a las solicitudes previas.

Se publicó una nueva solicitud de resumen técnico con los IDs y fallos anteriores:
[Mensaje solicitado a Hermes en Slack](https://nvaone.slack.com/archives/C0CE9B0AG7N/p1793796807761569?thread_ts=1793675448.274509).

**Estado:** gateway con señales de vida = PASS; respuesta de ejecución = UNKNOWN/FAIL; integración Hermes en worker/broker = FAIL (no está cableada en los workflows inspeccionados).

## Matriz C1–C5

| Criterio | Estado | Evidencia / límite |
|---|---|---|
| C1 — Integridad de código | WARN | 444/444 tests y build del run 41812299814; PR #270 falla Unit tests; #271 está dirty. |
| C2 — Integración | WARN | Un task durable se completó y persistió; no hay integración Hermes; Gemini sigue en worker autónomo. |
| C3 — Integridad de negocio | WARN | Sales devolvió WARN: Odoo y GTM/GA no declarados; no se probaron transacciones comerciales. |
| C4 — Experiencia | UNKNOWN | Esta revisión no ejecutó pruebas visuales ni sesiones de usuario. |
| C5 — Producción | FAIL | No existe prueba end-to-end con Hermes ni cierre de cola; queda task QA con lease vencido y 12 fallidas. |

## Responsables y siguiente trabajo

1. **Hermes (runtime):** responder en Slack con proveedor/modelo, runtime efectivo, run_id/task_id, logs claim → ejecución → finish, commits y causa de reinicios. Una señal “gateway online” no es ejecución.
2. **Mantenedor del worker durable:** reconciliar la tarea QA con lease vencido; corregir recuperación/expiración y demostrar que no se deja una tarea `running` sin lease vigente.
3. **Mantenedor de Agency:** consolidar #270/#271 en un único candidato revisable; mantener #272 separado hasta validar contrato OIDC y finish.
4. **Arquitectura de IA:** retirar la ambigüedad de proveedor y demostrar una llamada Hermes real end-to-end antes de marcar integración PASS.
5. **Owner:** autorizar expresamente cualquier merge, migración, cambio de permisos, despliegue o activación de worker/scheduler.

## Límites de esta revisión

Solo lecturas de Slack/GitHub y consultas SQL `SELECT`. No se ejecutaron migraciones, escrituras en Supabase, cambios de permisos, despliegues, merges, activaciones de workers/schedulers ni acciones irreversibles.


## Actualización operativa — 2026-11-05 09:12 CLST (12:12 UTC)

### 1. Hermes: ausencia de respuesta e integración no demostrada

- La lectura completa del hilo de cambio de mando (Slack, canal C0CE9B0AG7N, thread 1793675448.274509) confirma que no hay respuesta de Hermes después de sus mensajes de gateway del 2026-11-04 00:11 CLST. La búsqueda de mensajes del bot Hermes posteriores al 2026-11-04 no devuelve resultados.
- Se publicó una nueva solicitud técnica en el mismo hilo a las 2026-11-05 09:10 CLST: [solicitud a Hermes con la evidencia nueva](https://nvaone.slack.com/archives/C0CE9B0AG7N/p1793881043472489?thread_ts=1793675448.274509).
- El run [42001794314](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42001794314), job 127158569364, demuestra que el worker autónomo actual descarga google-github-actions/run-gemini-cli@v0.1.22 y configura GEMINI_MODEL=gemini-3.1-flash-lite. No ejecuta Hermes.
- El job reportó worker y cuatro continuaciones Gemini como SUCCESS, pero finish_task terminó con HTTP 502 y el error "exp claim timestamp check failed". No hay prueba de ejecución Hermes ni de subagentes Hermes.

**Bloqueo operativo confirmado:** el runtime de producción automatizado observado sigue siendo GitHub Actions + Gemini CLI. Hermes no respondió en Slack y no existe evidencia en los workflows revisados de una llamada a su runtime. El estado "gateway online" no prueba una tarea ejecutada.

### 2. Estado durable actualizado (consultas SELECT)

- Conteo actual de agency_tasks: 8 completed, 13 failed, 6 queued y 1 claimed (28 tareas).
- QA task 79927c95-7540-4fc4-83b9-0cbdf23a4033: status=claimed, attempt_count=1, result vacío, error nulo. El evento 107 registra task.claimed a las 09:22:21Z y un lease activo con expiración 15:22:21Z.
- El run 42001794314 empezó a las 09:22:09Z, seleccionó agente qa y terminó a las 09:36:38Z. La coincidencia temporal y de agente apunta a que es la tarea reclamada, pero el log del workflow no imprime task_id; por tanto, la correlación run_id ↔ task_id no es exacta ni auditable todavía.
- Aunque el workflow terminó FAILURE, el registro sigue claimed y el lease continúa activo hasta su expiración. No se modificó ni se intentó liberar el lease.
- La tarea release fee6a6c0-b8cb-44af-a450-84b793dbdbf5 agotó 3/3 intentos y quedó failed por max_attempts_exhausted; evento 104 task.recovery_exhausted.
- QA task f9132296-c736-47c3-9a21-b5782a98c682 sí terminó completed: run [41950533904](https://github.com/martinaburtoe-art/nuva-one/actions/runs/41950533904), job 126993148341, registra 401/401 tests PASS, pero excluye specialists.test.ts. No equivale a la suite completa.
- Orchestrator task 914f3792-99d1-4a33-a763-dad823dd5f2b sí terminó completed con verdict PASS en run [41995189997](https://github.com/martinaburtoe-art/nuva-one/actions/runs/41995189997), job 127136541421. Leyó 85.845 bytes de backlog y seleccionó T-138 (corregir errores de typecheck, P1); no implementó T-138.
- Run [41966482368](https://github.com/martinaburtoe-art/nuva-one/actions/runs/41966482368) terminó success usando Gemini, con Groq skipped y Create autonomous PR skipped. Run [41998207376](https://github.com/martinaburtoe-art/nuva-one/actions/runs/41998207376) terminó success, pero las etapas de checkout, reparación, verificación y push quedaron skipped; no hubo reparación.

### 3. PRs y CI actualizados

| PR | Estado al 2026-11-05 | Evidencia |
|---|---|---|
| [#270](https://github.com/martinaburtoe-art/nuva-one/pull/270) | Open, no draft, mergeable=false | CI run 41638309419 FAILURE; no integrable. |
| [#271](https://github.com/martinaburtoe-art/nuva-one/pull/271) | Open, draft, mergeable=false | Checks asociados SUCCESS, pero estado dirty; candidato duplicado del despacho de especialistas. |
| [#272](https://github.com/martinaburtoe-art/nuva-one/pull/272) | Open, listo para revisión, mergeable=true | Commit aea4dee4a99e960f51c65fec3839d68c16c24808; siete workflows asociados SUCCESS. Codex registró revisión de código completada sin hallazgos. Corrige tokens OIDC frescos por heartbeat/finish y exige ok=true. |
| [#273](https://github.com/martinaburtoe-art/nuva-one/pull/273) | Open, draft | Este documento de auditoría; actualización agregada en esta rama, sin merge. |
| [#274](https://github.com/martinaburtoe-art/nuva-one/pull/274) | Open, listo para revisión, mergeable=true | Commit final 5d6f3bb6b172cea814a2a18e674949e8f8d5733d; ocho checks asociados SUCCESS. Elimina la creación automática de tareas cuando la cola durable está vacía y añade regresión. Autor GitHub: martinaburtoe-art; no hay evidencia de autoría Hermes. |

El run [42006106717](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42006106717) del Autonomous Merge Controller terminó SUCCESS, pero tanto Final autonomous policy check como Merge verified Agency PR quedaron SKIPPED. No se produjo merge. Los PR #272 y #274 siguen sin fusionarse.

### 4. Matriz C1–C5 al 2026-11-05

| Criterio | Estado | Evidencia / límite |
|---|---|---|
| C1 — Integridad de código | WARN | #272 y #274 tienen CI asociado verde; #270 falla y #271 permanece dirty. #274 aún no está integrado en main. |
| C2 — Integración de runtime | FAIL | El worker de IA ejecuta Gemini CLI; no hay llamada Hermes demostrada ni respuesta del bot Hermes posterior al 04-nov 00:11 CLST. |
| C3 — Integridad de negocio | WARN | Hay tareas deterministas completadas, pero son inspecciones/selección de backlog; no prueban operaciones comerciales reales. |
| C4 — Experiencia | UNKNOWN | No se realizó validación visual ni sesión de usuario en este corte. |
| C5 — Operación durable | FAIL | El run 42001794314 falló en finish_task; su tarea QA asociada temporalmente permanece claimed con lease activo. Release agotó 3/3 intentos. |

### 5. Siguiente trabajo y responsables

1. **Hermes/runtime:** responder con host/runtime, proveedor/modelo, run_id/task_id, logs claim → ejecución → finish, commits y causa verificable de reinicios. Responsable: Hermes; bloqueado por ausencia de respuesta y falta de integración en workflows.
2. **Worker durable:** corregir el uso de token OIDC expirado y propagar correlación explícita run_id/task_id en eventos/logs. PR #272 contiene la corrección de token; requiere revisión y autorización del owner para merge.
3. **Cola y leases:** añadir recuperación segura de leases huérfanos tras fallo de workflow, con prueba que impida dejar tareas claimed después de un run terminado. Responsable: mantenedor de Agency.
4. **Control plane:** revisar #274 para evitar auto-enqueue infinito cuando la cola está vacía. Requiere revisión y autorización del owner para merge.
5. **Especialistas:** consolidar #270/#271 en un único candidato y ejecutar también specialists.test.ts; los 401/401 excluyen ese archivo.
6. **Owner:** cualquier merge, migración, escritura productiva, cambio de permisos, deploy o activación de worker/scheduler requiere autorización explícita.

### Límites del corte

Lecturas de Slack/GitHub y SQL SELECT. Se actualizó únicamente documentación en la rama del PR #273. No se ejecutaron migraciones, escrituras en Supabase, cambios de permisos, despliegues, merges, activaciones de workers/schedulers ni acciones irreversibles.


### 6. Sentinel y Web QA — hallazgos adicionales del 2026-11-05

- [Sentinel run 42005776226](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42005776226), job 127172011614: el workflow concluyó SUCCESS, pero el artefacto Sentinel reporta status=warning, 1 warning y 0 critical. Producción respondió HTTP 200. GitHub Actions detectó 1 workflow fallido/timeout reciente (el run durable 42001794314).
- La comprobación Supabase del Sentinel quedó SKIPPED: el log muestra NUVA_SUPABASE_URL vacío en el job. El paso de persistencia también quedó SKIPPED; scripts/nuva-agency-persist-incidents.mjs informó que falta NUVA_SUPABASE_URL o NUVA_SUPABASE_SERVICE_ROLE_KEY. Como NUVA_SUPABASE_URL está vacío, no se puede concluir si la service-role key también falta.
- El workflow .github/workflows/nuva-agency-sentinel.yml toma esas variables de GitHub Actions Secrets, no del .env.local de Windows. El script de persistencia hace POST a public.ops_incidents cuando dispone de las credenciales. Por respeto a la prohibición de escrituras productivas, no se configuraron secrets ni se habilitó esa escritura. Antes de configurar NUVA_SUPABASE_SERVICE_ROLE_KEY debe autorizarse expresamente el comportamiento de persistencia automática.
- [Web QA run 42024983442](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42024983442), job 127236813278: status=healthy, 0 warning y 0 critical. Las rutas públicas /, /directorio, /foro y /news respondieron HTTP 200; assets del mismo origen y headers base pasaron. Esto no cubre login, sesiones ni flujos autenticados.
- Se solicitó a Hermes en Slack que concilie estos hallazgos: [addendum del Sentinel y Web QA](https://nvaone.slack.com/archives/C0CE9B0AG7N/p1793881311108079?thread_ts=1793675448.274509). Sin respuesta observada al corte.


### 7. Calidad de las pruebas contractuales de los PRs

- En PR #274, el archivo src/lib/agency/empty-queue.test.mjs lee los archivos fuente y comprueba la presencia/ausencia de cadenas. No invoca la ruta API ni la Edge Function, no simula el RPC agency_claim_task devolviendo null y no comprueba el comportamiento en runtime. Se dejó una observación no bloqueante en el PR (comentario 6657834141): añadir pruebas de comportamiento con Supabase mock.
- En PR #272, scripts/agency-worker-oidc-workflow.test.mjs cuenta patrones del YAML y comprueba que finish_task exija ok=true. No simula la expiración OIDC ni ejecuta una llamada finish_task contra un entorno de prueba. Se dejó una observación no bloqueante en el PR (comentario 6657866956): mantener pendiente la validación end-to-end después de una integración autorizada.
- Por tanto, los checks verdes de #272/#274 son evidencia de CI, estructura y compilación, pero no certifican por sí solos que Supabase acepte el token renovado ni que los handlers se comporten correctamente en runtime. No se solicitó merge ni deploy.
