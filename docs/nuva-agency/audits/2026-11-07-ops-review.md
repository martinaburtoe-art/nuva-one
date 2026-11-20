# Nüva Agency — auditoría operativa del 7-nov-2026

**Corte:** 2026-11-07 09:12 CLST (12:12 UTC)  
**main observado:** `49812211d09ab15ec015a925447351c9b4d17caf`  
**Supabase:** `vnzyecnbdqbfuxawzrda`  
**Método:** Slack/GitHub y logs de Actions; SQL exclusivamente SELECT. Sin escrituras productivas, migraciones, cambios de permisos, despliegues, merges ni activaciones.

## Dictamen

**Nüva Agency sigue sin estar cerrada.** El control durable tiene un ciclo real con correlación exacta, pero el runtime observado es Gemini CLI, no Hermes. PR #276 tiene una brecha de cobertura: su test de regresión está fuera de los patrones de Vitest.

## Cambios remotos recientes

- [PR #272](https://github.com/martinaburtoe-art/nuva-one/pull/272) se fusionó el 2026-11-07 02:25:50Z por la cuenta GitHub `martinaburtoe-art`; merge commit `c9067d7f069366e0db9b3e1b26533a47e9b9af9d`. Incluye tokens OIDC frescos y correlación `run_id/task_id`.
- [PR #274](https://github.com/martinaburtoe-art/nuva-one/pull/274) se fusionó a las 02:25:55Z por la misma cuenta; merge commit `49812211d09ab15ec015a925447351c9b4d17caf`. Evita fabricar tareas cuando la cola está vacía.
- Estos merges se observaron en GitHub; no fueron ejecutados por esta auditoría ni se atribuyen a Hermes.

## Ciclo durable comprobado — no Hermes

- [Run 42361769932](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42361769932), job `128371471164`.
- Task `c199c145-7985-4624-9ecd-2e7c11fa53ba`, agente `ux`.
- El log confirma `google-github-actions/run-gemini-cli@v0.1.22`, modelo `gemini-3.1-flash-lite`.
- Supabase `agency_events`: evento 136 `task.claimed` y 137 `task.completed`; el payload de finalización contiene exactamente `run_id=42361769932` y el mismo `task_id`.
- `agency_tasks.status=completed`; lease `8bbf3557-b12f-4951-bd3c-eaae8dda1b92` quedó `released`.

**Interpretación:** PASS para claim → ejecución Gemini → finish persistido y correlacionado. No es Hermes. Los cinco `response_excerpt` están vacíos y no hay commit/PR atribuible a este run; entrega funcional de código no demostrada.

## Cola y misiones (SELECT)

| Estado de `agency_tasks` | Cantidad |
|---|---:|
| completed | 18 |
| failed | 13 |
| queued | 6 |
| running / claimed | 0 |

- Leases válidos activos (`status='active' AND expires_at > now()`): 0.
- Filas históricas expired/stale: 82; released: 34. Son registros históricos, no leases actuales.
- Misión permanente `610174c1-a39b-4a23-80bd-474a8e8a21ef`: `running`, agente UX, último heartbeat 10:12:15Z; edad aproximada 2h al corte.
- Misión E2E `2c843278-0a70-42e3-8cb1-53d4d0cbde6e`: `running`, último heartbeat 2026-10-12 19:50:19Z; edad aproximada 25 días.
- Compliance `a642acd6-cbd2-4c35-85b4-6560b970cae1` sigue queued y su lease está expired.
- Sales `d8804176-4521-4fc2-be94-d0a7363926da` sigue queued tras un intento fallido; el resultado registra fallback Groq excediendo 8.000 TPM.

Los estados de misión `running` no prueban worker activo: no hay leases vigentes.

## PR #276 — brecha de validación

[PR #276 — harden registered specialist dispatch](https://github.com/martinaburtoe-art/nuva-one/pull/276) está abierto, no draft, mergeable y con 10 checks SUCCESS; no tiene reviews registradas.

- `vitest.config.ts` incluye solo `src/**/*.test.ts`, `src/**/*.test.tsx` y `tests/**/*.test.ts`.
- `scripts/agency-durable-worker.test.mjs` no coincide con esos patrones; CI no demuestra que ejecute esta regresión.
- El test file contiene cuatro pruebas de heartbeat (renovación, pérdida de lease, reintentos y agotamiento). El `scripts/agency-durable-worker.mjs` inspeccionado hace claim → especialista → finish, sin llamadas heartbeat ni lógica de aborto/reintentos de heartbeat.
- Si se incluyera el test tal como está, esas pruebas de heartbeat no corresponderían al código actual.

Se dejó comentario técnico en [PR #276](https://github.com/martinaburtoe-art/nuva-one/pull/276#issuecomment-6706864582): ejecutar el archivo exacto en CI y alinear pruebas/implementación antes de considerarlo integrable.

## Workers auxiliares y Sentinel

- [Autonomous Repair Worker 42364371198](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42364371198): workflow SUCCESS, pero inspección, checkout, reparación, verificación y push quedaron SKIPPED; no hubo reparación.
- [Autonomous Merge Controller 42364037145](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42364037145): workflow SUCCESS, pero policy check y merge quedaron SKIPPED; no hubo merge en ese run.
- [Sentinel 42363205656](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42363205656): artefacto `status=warning`, 1 warning, 0 critical. Supabase REST fue SKIPPED porque `NUVA_SUPABASE_URL` y `NUVA_SUPABASE_ANON_KEY` estaban vacíos. `agency:persist` también fue SKIPPED por URL/service-role ausentes; no hubo POST a `ops_incidents`.
- [Health Auditor 42369560936](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42369560936): usa `google-github-actions/run-gemini-cli@v0.1.22`, modelo `gemini-3-flash-preview`; no es Hermes.

## Hermes y Slack

- En `#nuva-agency-bridge` y el hilo de cambio de mando no hay respuesta de Hermes posterior al 2026-11-04 00:11 CLST.
- Búsqueda de mensajes de Hermes posteriores al 2026-11-06: sin resultados.
- Se publicó nueva solicitud de informe: [mensaje Slack del 7-nov](https://nvaone.slack.com/archives/C0CE9B0AG7N/p1794054054454569?thread_ts=1793675448.274509).
- Los mensajes “gateway online” no prueban ejecución. No se encontraron logs, commits ni task_id que acrediten trabajo de Hermes/subagentes.

## Matriz C1–C5

| Criterio | Estado | Evidencia / límite |
|---|---|---|
| C1 — Integridad de código | WARN | #272/#274 integrados; #276 tiene 10 checks verdes, pero su test .mjs está excluido por Vitest. |
| C2 — Integración Hermes | FAIL | Worker IA usa Gemini CLI; no hay respuesta ni ejecución Hermes demostrada. |
| C3 — Integridad de negocio | WARN | Tareas completadas son mayormente auditorías/inspecciones; no prueban procesos comerciales end-to-end. |
| C4 — Experiencia | UNKNOWN | Sin pruebas visuales ni sesiones autenticadas en este corte. |
| C5 — Operación durable | WARN | Un ciclo Gemini correlacionado terminó y liberó lease; 6 tareas queued, 13 failed y misiones running con heartbeat atrasado. |

## Siguiente tarea y responsables

1. **Mantenedor de #276:** incluir y ejecutar `scripts/agency-durable-worker.test.mjs` en CI; alinear o implementar heartbeat y adjuntar log del test exacto.
2. **Mantenedor del worker IA:** no marcar una tarea como entrega útil si todos los `response_excerpt` están vacíos; exigir resultado/artefacto verificable y registrar commit/PR cuando corresponda.
3. **Hermes/runtime:** aportar host, proveedor/modelo, run_id/task_id, logs claim → ejecución → finish, commits y pruebas; si no ejecutó, decirlo explícitamente.
4. **Owner:** revisar #276 y autorizar expresamente cualquier merge, migración, escritura productiva, cambio de permisos, despliegue o activación de worker/scheduler.

## Límites

Auditoría read-only de Supabase y GitHub/Slack. Se añadió un comentario de revisión a PR #276. No se ejecutaron escrituras en producción, migraciones, cambios de permisos, despliegues, merges ni activaciones.
