# Nüva Agency — auditoría de cierre y desbloqueo de T-134

**Fecha de observación:** 2026-11-09 09:31 CLST (12:31 UTC)  
**Repositorio:** `martinaburtoe-art/nuva-one`  
**Proyecto Supabase:** `vnzyecnbdqbfuxawzrda`  
**Alcance:** lectura de Slack, GitHub y Supabase; documentación y ajuste de dependencia del backlog en una rama aislada.  
**No se realizaron:** migraciones, escrituras en Supabase, cambios de permisos, despliegues, merges, activación de workers/schedulers ni acciones irreversibles.

## Dictamen ejecutivo

Nüva Agency no está cerrada. Hay persistencia durable de tareas y algunos ciclos deterministas completados, pero no existe evidencia verificable de que Hermes haya ejecutado una tarea Agency. El principal bloqueo inmediato del backlog es circular: T-134 es la tarea que debe investigar los bloqueos de T-20/T-21/T-22/T-27/T-28/T-32, pero depende de esas mismas tareas bloqueadas. T-136 depende de T-134. El selector, por diseño, no puede elegir ninguna de las dos.

Este PR corrige solo la dependencia documental de T-134 a T-33 (COMPLETADO), mantiene T-134 en PENDIENTE y deja T-136 dependiente de T-134. No declara tareas completadas ni ejecuta trabajo operativo.

## 1. Hermes y el bloqueo local

Lectura de `#nuva-agency-bridge`:

- 2026-11-08 00:59:35 CLST: Hermes reportó `ENOSPC: No space left on device` en `%LOCALAPPDATA%\\hermes\\cron`.
- 2026-11-08 02:08:35 CLST: Hermes informó que el cron store volvió a ser escribible y que haría catch-up de una ejecución omitida.
- 2026-11-08 13:03:32 CLST: el mismo cron store volvió a fallar con `ENOSPC`; los jobs programados quedaron omitidos.
- 2026-11-08 20:05:16 CLST: Hermes informó que estaba reiniciando y que la tarea actual sería interrumpida.

La recuperación de las 02:08 fue temporal: el error ENOSPC reapareció a las 13:03. En la lectura del canal y del hilo de solicitud de catch-up no hay respuesta de Hermes con nombres de jobs, run IDs, task IDs, logs ni resultados. Tampoco hay prueba de que el catch-up haya ejecutado trabajo de Nüva Agency.

**Límite de esta auditoría:** no hay acceso al proceso ni al disco Windows local desde esta ejecución. No se puede verificar espacio libre actual, ACL del directorio, PID, exit code ni estado actual del cron store. Responsable: operador local de Hermes. Siguiente evidencia necesaria: espacio libre de C:, prueba de escritura no destructiva en cron store, logs de arranque/reinicio y lista de jobs omitidos con run IDs.

## 2. Ejecución durable observada en Supabase

Consulta de solo lectura observada el 2026-11-09 12:31:59 UTC:

| Estado de `agency_tasks` | Cantidad |
|---|---:|
| completed | 41 |
| failed | 14 |
| queued / pending | 0 |
| claimed | 0 |
| running | 0 |

Leases en `agency_agent_leases`:

| Estado | Cantidad |
|---|---:|
| released | 71 |
| expired | 48 |
| active no vencidos | 0 |

La cola durable de Supabase está vacía. Esto no significa que el backlog Markdown esté vacío.

### Última tarea de Orchestrator

- Task: `92340987-744a-4917-bc68-795f4cf59b61`
- Agente: `orchestrator`
- Estado final: `completed`, `attempt_count=2`
- Resultado: `WARN`, duración reportada 3 ms.
- Evidencia persistida: backlog leído (86.614 bytes), 2 tareas PENDIENTE, 0 tareas elegibles por dependencias.
- Eventos: `task.claimed` id 208, `task.failed` id 209, segundo `task.claimed` id 210, `task.completed` id 211.

El primer intento corresponde a GitHub Actions run [42571471669](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42571471669). Su log confirma Gemini CLI, no Hermes:
- Gemini Free Tier agotó la cuota diaria (límite observado: 20 solicitudes para el modelo efectivo).
- El proxy local Groq en `127.0.0.1:4318` no aceptó conexión.
- Groq rechazó una solicitud de 8.139 tokens frente a 8.000 TPM.
- Después apareció `tool_use_failed`.

El segundo claim terminó con un resultado determinista de Orchestrator que solo detectó 0 tareas elegibles. El evento final no contiene `run_id`, por lo que no se atribuye a Hermes ni se correlaciona con un workflow específico.

### QA y UX

- QA task `20f58ffd-1330-4341-9b4b-1229bb85e9a5`, run [42538186226](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42538186226): la tarea quedó completed, pero los cinco `response_excerpt` están vacíos. El job ejecutó Gemini CLI.
- UX task `d9b010c6-ca7b-49d8-9108-7e8abfe5f174`, run [42521237633](https://github.com/martinaburtoe-art/nuva-one/actions/runs/42521237633): los cinco `response_excerpt` también están vacíos. El job ejecutó Gemini CLI.

Estos runs demuestran ciclos registrados, no entregas de código ni ejecución Hermes.

## 3. Causa de cero tareas elegibles

El selector `scripts/agency-select-next-task.mjs` incluye solo tareas con estado `PENDIENTE` cuyas dependencias estén todas en `COMPLETADO`.

En `docs/nuva-agency/AGENT_BACKLOG.md` las dos tareas pendientes son:

| Tarea | Dependencia original | Resultado |
|---|---|---|
| T-134 — investigar desbloqueo | T-20, T-21, T-22, T-27, T-28, T-32 | Todas están BLOCKED |
| T-136 — resolver dependencias | T-134 | No puede avanzar hasta T-134 |

T-134 no puede investigar los bloqueos porque el selector exige que los bloqueos ya estén resueltos. Es una dependencia circular de planificación, no un fallo de proveedor.

**Cambio preparado en esta rama:** T-134 depende ahora de T-33 (COMPLETADO). T-134 sigue PENDIENTE; T-136 sigue PENDIENTE y depende de T-134. Aplicando la lógica del selector, T-134 pasa a ser elegible y T-136 continúa correctamente esperando el resultado de T-134.

## 4. Estado de los bloqueos

| Tarea | Estado del backlog | Evidencia actual | Siguiente acción segura |
|---|---|---|---|
| T-20 — persistencia | BLOCKED | Migración remota `20261103022653 agency_service_role_privileges` aplicada; falta prueba E2E claim/finish/recuperación. | Preparar plan de canary en Preview; no tocar producción. |
| T-21 — scheduler | BLOCKED | `main` conserva GitHub Actions cada 20 min y en push; no hay prueba de ciclo completo con recuperación. | Reconciliar un solo scheduler y documentar la prueba de Preview. |
| T-22 — Owner Console | BLOCKED | PR #252 está merged y contiene UI/API; no se verificó sesión real de owner ni CRUD durable E2E. | Diseñar prueba autenticada en Preview con datos de prueba. |
| T-27 — recuperar scheduler | BLOCKED | Requiere claim/finish posterior al hardening OIDC. | Esperar hardening autorizado y luego canary aislado. |
| T-28 — sesión real | BLOCKED | Sin sesión autenticada de propietario comprobada. | Ejecutar flujo de Preview cuando haya cuenta de prueba autorizada. |
| T-31 — hardening OIDC | EN_CURSO | La Edge Function remota `nuva-agency-worker-control` sigue ACTIVE v16. | Validar código y pruebas en PR; no desplegar sin autorización. |
| T-32 — desplegar hardening | BLOCKED | Requiere desplegar Edge Function; fuera de la autorización actual. | Esperar autorización explícita de deploy. |
| T-40 — revisión de permisos | BLOCKED | Depende de T-31 y del despliegue de hardening. | Completar documentación y rollback; no desplegar. |
| T-49 / T-50 — ciclo integral | BLOCKED | T-49 depende de T-40; T-50 depende de T-49. | No forzar estado; resolver dependencias autorizadas. |

### Supabase: seguridad del control plane

- Las seis tablas Agency tienen RLS habilitado.
- `pg_policies` no devuelve políticas cliente para esas seis tablas.
- `service_role` tiene SELECT/INSERT/UPDATE/DELETE efectivo sobre las seis tablas. T-29 figura COMPLETADO y la migración remota está registrada; el alcance CRUD completo debe compararse con el mínimo realmente requerido, sin cambiar grants en esta auditoría.
- Las funciones productivas `agency_claim_task` y `agency_claim_task_by_id` siguen generando tokens mediante MD5, no CSPRNG de 256 bits.
- `agency_finish_task` no tiene el comportamiento exact-payload idempotente propuesto en PR #302; si el lease ya no está active, retorna false.
- Historial remoto de migraciones: última entrada observada `20261108013902 / inngest_task_scoped_claim_20261108010000`. Las migraciones PR #302 `20261108040000`, `050000`, `060000` y `070000` no aparecen en el historial remoto.

La Edge Function `nuva-agency-worker-control` sigue ACTIVE v16. No se desplegó hardening.

## 5. Pull requests y procedencia

| PR | Estado observado | Conclusión |
|---|---|---|
| [#302](https://github.com/martinaburtoe-art/nuva-one/pull/302) | Open, mergeable, 196 commits ahead; 7 workflows SUCCESS | CI verde no equivale a migraciones aplicadas. Mantener sin merge hasta resolver duplicaciones, CSPRNG, idempotencia y runbook de migraciones. |
| [#291](https://github.com/martinaburtoe-art/nuva-one/pull/291) | Open; 4 commits ahead / 5 behind main | No integrado; rama divergente. |
| [#292](https://github.com/martinaburtoe-art/nuva-one/pull/292) | Open; 1 commit ahead / 5 behind main | Reduce el worker de IA a 4 ciclos/día, pero no está integrado. Main aún ejecuta push + cron cada 20 min. |
| [#279](https://github.com/martinaburtoe-art/nuva-one/pull/279) | Draft, mergeable=false; 1 ahead / 34 behind main | Respaldo, no integración. El autor y committer del commit `3a977052` aparecen como la cuenta GitHub `martinaburtoe-art`; el documento que menciona “Hermes Agent” no incluye run_id/task_id/logs verificables. No atribuir ese trabajo a Hermes sin evidencia adicional. |

El worker durable en `main` ejecuta especialistas registrados mediante Node.js; el workflow LLM inspeccionado llama `google-github-actions/run-gemini-cli@v0.1.22`, modelo `gemini-3.1-flash-lite`. No se encontró una llamada de runtime Hermes en ese camino.

## 6. Matriz C1–C5

| Criterio | Estado | Motivo |
|---|---|---|
| C1 — Integridad de código | WARN | PR #302 tiene CI verde, pero cambios críticos no están en producción; tokens MD5 y finish no idempotente siguen activos. |
| C2 — Integración Hermes | FAIL | No hay tarea Agency con runtime Hermes, run_id/task_id, logs y resultado verificables. |
| C3 — Integridad de negocio | WARN | Persistencia y especialistas existen, pero el backlog no permite ejecutar la cadena de cierre; no hay entrega comercial E2E. |
| C4 — Experiencia | UNKNOWN | No se verificó sesión real de Owner Console ni flujo autenticado completo. |
| C5 — Operación | FAIL | Cron store reportó ENOSPC recurrente, Hermes reinició, main sigue con Gemini y no hay tareas elegibles. |

## 7. Siguiente secuencia concreta

1. Revisar y aceptar el cambio documental de T-134 en este PR; no mergear automáticamente.
2. Ejecutar T-134 como investigación de solo lectura una vez que el cambio de dependencia esté integrado/autorizado.
3. Mantener T-136 bloqueada hasta que T-134 deje evidencia y cierre su investigación.
4. Resolver el problema local de disco/cron store de Hermes y obtener su informe de catch-up con logs.
5. Consolidar #291/#292 con el estado actual de main y revisión independiente; no dejar ramas divergentes como solución efectiva.
6. Mantener Inngest y claims generales desactivados; el hardening de Edge Function requiere autorización expresa de despliegue.
7. Solo después de autorizar el hardening y preparar un canary aislado, ejecutar claim → heartbeat → specialist → finish → lease released con resultado no vacío y evidencia correlacionada.

**Responsables:** operador local Hermes (disco/cron), mantenedor Agency (backlog y workers), mantenedor de seguridad (OIDC/tokens), owner (autorización de despliegue y cualquier acción productiva).

**Conclusión:** el bloqueo inmediato de la selección del backlog es corregible sin producción: T-134 no debe depender de las tareas que debe investigar. El bloqueo de runtime Hermes sigue separado y requiere acceso local al Windows del usuario.