# Nüva Agency — auditoría operativa y evidencia

**Fecha de corte:** 2026-11-06 09:07 CLST (12:07 UTC)
**Repositorio:** `martinaburtoe-art/nuva-one`
**`main` observado:** `b0e91154ac6611a0129f94b64e3aec3aaeb6a23c` (merge de PR #269)
**Supabase:** proyecto `vnzyecnbdqbfuxawzrda`; consultas exclusivamente `SELECT`
**Alcance:** Slack #nuva-agency-bridge, GitHub Actions, PRs y estado durable. Escrituras no productivas limitadas a documentación en PR #273, instrumentación/pruebas en la rama de PR #272, comentario de evidencia en #272 y solicitudes en Slack. No hubo escrituras en Supabase.

## Dictamen

**Nüva Agency continúa sin cierre operativo.** Se confirmó una nueva tarea determinista de supply completada y persistida, pero el worker de IA volvió a fallar al finalizar una tarea por expiración del token OIDC. El registro de la tarea security permanece `running` con lease activo, sin evento `task.completed`. Hermes no respondió en Slack y los workflows inspeccionados siguen invocando Gemini CLI, no Hermes.

## 1. Hermes y Slack

- La lectura de `#nuva-agency-bridge` no muestra respuestas de Hermes posteriores al 2026-11-04 00:11:44 CLST.
- Los últimos mensajes del canal son solicitudes del owner del 2026-11-05 09:17 y 09:21 CLST; no contienen respuesta de Hermes ni informe de subagentes.
- La búsqueda de mensajes con Hermes posteriores al 2026-11-05 no devolvió resultados.
- Las señales previas `Gateway online` solo prueban que el bot anunció disponibilidad; no prueban ejecución de tareas.
- Se solicitó un nuevo resumen técnico a Hermes en el hilo de cambio de mando, con la evidencia del run 42208744876 y la tarea security pendiente.

**Bloqueo:** no hay respuesta verificable del runtime local de Hermes, ni logs de subagentes, ni correlación run_id/task_id atribuible a Hermes. La causa de su silencio o de los reinicios del gateway Windows no puede diagnosticarse desde los conectores disponibles.

## 2. Nueva evidencia de ejecución durable

### 2.1 Tarea supply completada

- Workflow: [run 42197561685](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42197561685), job `127824512775`.
- Especialista: `supply`.
- Task: `74f5e4ac-6743-4162-89f0-7be97b70dde0`.
- Supabase registra `status=completed`, `attempt_count=2`, `error=null`, `result.verdict=PASS`.
- Eventos: `task.claimed` (id 117) y `task.completed` (id 118). Lease `00713ed0-1621-4e36-92f4-7fdac292e467` quedó `released`.
- Evidencia producida: lectura del archivo de migración del control plane, `package.json` y comprobación de que las tablas `agency_tasks` y `agency_missions` están declaradas.

**Interpretación:** ciclo claim → ejecución determinista → finish persistido confirmado para una auditoría de legibilidad. No es una integración con Hermes ni una entrega funcional del módulo Supply.

### 2.2 Worker de IA falló al finalizar

- Workflow: [run 42208744876](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42208744876), job `127861843454`, terminó `FAILURE`.
- El job seleccionó `security`; los cuatro pases de Gemini aparecen como `success`.
- El paso `Finish persisted task` agotó reintentos y devolvió HTTP 502 con `{"error":"\"exp\" claim timestamp check failed"}`.
- El workflow principal sigue obteniendo `AGENCY_OIDC_TOKEN` en el paso de claim y reutilizándolo en `finish_task`; el archivo actual de `main` envía `X-Agency-OIDC-Token: $AGENCY_OIDC_TOKEN` en el cierre.
- PR [#272](https://github.com/martinaburtoe-art/nuva-one/pull/272) propone obtener un token OIDC fresco para heartbeat y finish, además de exigir `ok=true` en el cuerpo de respuesta. Sigue abierto y no está fusionado.

### 2.3 Tarea security sin cierre persistido

- Task: `c236aac0-929c-4ba7-8155-88648cef5d17`, agente `security`, estado `running`, intento 1/3.
- Lease: `3b784208-762a-4981-b5bf-c1a45f0d3937`, `status=active`, heartbeat `2026-11-06 11:19:14 UTC`, expiración `12:19:14 UTC`.
- Supabase conserva solo el evento `task.claimed` (id 119); no existe `task.completed`, `output_summary` ni resultado.
- El agente y la hora de claim coinciden con el run 42208744876, pero el log del workflow no imprime `task_id`. La correlación es probable, no exacta ni plenamente auditable.
- No se liberó el lease ni se cambió el estado de la tarea.

## 3. Cuota de proveedores

- [Run 42182993344](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42182993344) terminó `FAILURE`.
- Gemini CLI registró `TerminalQuotaError`: cuota diaria agotada en el modelo Gemini 3.8 Flash del free tier (límite reportado: 20 solicitudes/día).
- El fallback Groq devolvió límite de 8.000 TPM; la solicitud reportada fue de 9.876 tokens.
- No se produjo PR autónomo: `Create autonomous PR` quedó `skipped`.

**Bloqueo:** los proveedores configurados no garantizan capacidad suficiente para completar ciclos largos; el fallback también puede fallar por tamaño de contexto.

## 4. Sentinel, reparación y merge controller

### Sentinel

- [Run 42210941035](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42210941035) terminó con conclusión de workflow `success`, pero el artefacto declara `status=warning`.
- Producción respondió HTTP 200; el Sentinel detectó un workflow fallido/timeout reciente.
- `NUVA_SUPABASE_URL` y `NUVA_SUPABASE_ANON_KEY` llegaron vacíos al job; la comprobación de Supabase quedó `skipped`.
- `NUVA_SUPABASE_SERVICE_ROLE_KEY` también llegó vacío; `agency:persist` informó `skipped`. No hubo POST de persistencia en este run.
- No configurar el secreto de service role en este workflow sin autorización: `scripts/nuva-agency-persist-incidents.mjs` realiza POST a `public.ops_incidents` cuando dispone de credenciales.

### Autonomous Repair Worker

- [Run 42209121854](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42209121854) terminó `success`, pero `Inspect autonomous diff policy`, checkout, reparación, verificación y push quedaron `skipped`. No hubo reparación.

### Autonomous Merge Controller

- [Run 42211432437](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42211432437) terminó `success`, pero `Final autonomous policy check` y `Merge verified Agency PR` quedaron `skipped`. No hubo merge.

## 5. Estado actual de persistencia (SELECT)

| Estado | Tareas |
|---|---:|
| completed | 12 |
| failed | 13 |
| queued | 7 |
| running | 1 |
| **Total** | **33** |

- Hay 1 lease activo no vencido: corresponde a la tarea security `c236aac0-929c-4ba7-8155-88648cef5d17`.
- Misiones: 1 `completed`, 2 `running`.
- El conteo de tareas completadas incluye auditorías deterministas de lectura; no debe interpretarse como 12 entregas de negocio.

## 6. PRs

| PR | Estado observado al corte |
|---|---|
| [#272](https://github.com/martinaburtoe-art/nuva-one/pull/272) | Open, ready for review, `mergeable=true`; no merge. Corrección OIDC/finish. |
| [#274](https://github.com/martinaburtoe-art/nuva-one/pull/274) | Open, ready for review, `mergeable=true`; no merge. Evita generar tareas cuando la cola está vacía. |
| [#273](https://github.com/martinaburtoe-art/nuva-one/pull/273) | Open, draft; contiene esta línea de auditoría. |
| [#271](https://github.com/martinaburtoe-art/nuva-one/pull/271) | Open, draft; candidato de despacho de especialistas. |
| [#270](https://github.com/martinaburtoe-art/nuva-one/pull/270) | Open; candidato anterior de despacho, con CI fallido reportado previamente. |

El merge controller no integró ningún PR en el run 42211432437. No se realizó ningún merge en esta revisión.

## 7. Matriz C1–C5

| Criterio | Estado | Evidencia y límite |
|---|---|---|
| C1 — Integridad de código | WARN | PR #272 y #274 están mergeable y abiertos; el worker de IA sigue fallando al finalizar. |
| C2 — Integración Hermes | FAIL | Sin respuesta del bot ni invocación Hermes demostrada; worker actual usa Gemini CLI. |
| C3 — Integridad de negocio | WARN | Las tareas nuevas son auditorías de legibilidad; no demuestran procesos comerciales completos. |
| C4 — Experiencia | UNKNOWN | Esta revisión no ejecutó validación visual ni flujos autenticados. |
| C5 — Operación durable | FAIL | 13 tareas failed, 1 running sin finish persistido y error OIDC 502. |

## 8. Responsables y siguiente tarea concreta

1. **Mantenedor del worker:** integrar #272 solo con autorización del owner y demostrar un ciclo real claim → heartbeat → finish con token OIDC renovado y task_id correlacionado en logs/eventos.
2. **Mantenedor de Agency:** revisar la tarea security sin cierre; no liberar ni reintentar en producción sin autorización y procedimiento seguro.
3. **Arquitectura IA:** demostrar una llamada real Hermes → especialista → resultado → persistencia, con run_id y task_id correlacionados; si Hermes no puede operar, documentar host/acceso faltante.
4. **Mantenedor Sentinel:** resolver la ausencia de credenciales de lectura de Supabase sin habilitar escrituras automáticas; mantener persistencia desactivada hasta autorización.
5. **Owner:** decidir sobre merges de #272/#274 y cualquier escritura productiva, migración, cambio de permisos, deploy o activación.

## Límites

Las lecturas de Supabase fueron exclusivamente `SELECT`. Las escrituras se limitaron a ramas de PR, comentario de revisión y mensajes Slack. No se ejecutaron migraciones, escrituras en Supabase, cambios de permisos, despliegues, merges, activaciones de workers/schedulers ni acciones irreversibles.
## Actualización de esta revisión — 2026-11-06 09:16 CLST (12:16 UTC)

### Instrumentación añadida a PR #272

- Commit `d02b5b289130ab0ee115593d708111e4b7beec98`: el workflow extrae `claimed.task.id`, falla de forma cerrada si falta, lo expone como `active_task_id` y registra `task_id`, `run_id` y agente en el log de claim.
- Commit `a305e87123f74e23f0504790bdcbf885caa26db6`: añade una prueba contractual para la instrumentación y agrega `task_id` al objeto `result` enviado por `finish_task`, junto con `run_id`.
- Archivos modificados: `.github/workflows/nuva-agent-durable-worker.yml` y `scripts/agency-worker-oidc-workflow.test.mjs`.
- Verificación remota: ambos archivos se volvieron a leer desde la rama `fix/agency-worker-oidc-refresh-20261103`; las cadenas de extracción, salida, persistencia y prueba están presentes.
- CI del commit `a305e87123f74e23f0504790bdcbf885caa26db6`: Safety Verification, Web QA y Production Smoke `success`; People build `in_progress`; CI Fast, CI principal y reviewer `pending` al último sondeo. No se declara CI completo.
- PR #272 continúa abierto, no draft y `mergeable=true`; no se fusionó ni desplegó.

### Estado del PR documental #273

- Documento creado en commit `e616b97eca68690e1df92e017089c09105187b6d`.
- CI Fast, Control Plane Verify, People build, Safety Verification y Production Smoke `success`; CI principal y reviewer seguían en progreso al último sondeo.
- PR #273 continúa draft y abierto.

### Seguimiento Hermes

- Se publicó la actualización de evidencia y la solicitud de respuesta en [Slack #nuva-agency-bridge](https://nvaone.slack.com/archives/C0CE9B0AG7N/p1793967388788309?thread_ts=1793675448.274509&cid=C0CE9B0AG7N).
- La lectura posterior del hilo no encontró respuesta de Hermes.
- La notificación al hilo padre mediante Automations devolvió `404 Action not found`; no se pudo entregar desde esta sesión.

### Persistencia al último sondeo

- La tarea security `c236aac0-929c-4ba7-8155-88648cef5d17` seguía `running`, sin `task.completed`; lease `3b784208-762a-4981-b5bf-c1a45f0d3937` seguía `active` hasta `12:19:14 UTC`.
- Conteos sin cambios: 12 completed, 13 failed, 7 queued, 1 running.
- No se liberó ni modificó el lease.