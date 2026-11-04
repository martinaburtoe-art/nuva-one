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
