# Frente B — Estado de la cola y plan de recuperación (Nüva Agency)

**Estado:** borrador para revisión del owner. No se mutaron tareas productivas.
**Fecha:** 2026-11-04. Rama de trabajo: `t-27-constructor-prep` (working tree con cambio ajeno en `src/routes/api/owner/agency-control.ts`: solo ampliación de la lista `AGENTS`; el bug del loop sigue presente localmente).
**Repositorio:** `C:/Users/marti/Documents/nuva-one` (origin: `martinaburtoe-art/nuva-one`).

---

## 1. Resumen ejecutivo

La cola de trabajo vive en Supabase (tablas `agency_missions`, `agency_tasks`, `agency_agent_leases`, `agency_events`, `agency_approvals`, `agency_artifacts`) expuesta por la Edge Function `supabase/functions/nuva-agency-worker-control/index.ts` y la ruta local `src/routes/api/owner/agency-control.ts`.

**Hallazgo crítico:** el endpoint `claim_task` fabrica automáticamente una tarea `Autonomous <agent> cycle` cuando `agency_claim_task` devuelve cola vacía. Eso obliga al worker a re-crear y reclamar trabajo sin fin (**loop infinito de generación de tareas con cola vacía**). **PR #274 (`refs/pull/274/head = 5d6f3bb`) elimina ese bloque en ambos archivos y añade una prueba `empty-queue.test.mjs`. Verificado por diff: tras el fix, `claim_task` devuelve `claimed: null` y no crea tarea. No está mergeado.**

**Evidencia de fallo por agotamiento de intentos (logs locales):** `logs/cycles/index.json` registra 170 ejecuciones: 88 PASS / 36 FAIL / 29 WARN / 17 BLOCKED. La tarea **T-138 falló 32 veces** entre `2026-11-03T21:56:15` y `2026-11-04T01:29:19` (~cada 5–6 min), patrón clásico de reintentos hasta agotar `max_attempts`. También fallaron T-21 (2×), T-20 (1×), T-10 (1×). El scheduler fallaba cíclicamente (`exitCode=1`, alerts de supervisor 04–05/11 cada ~6–12 min).

**Nota importante:** las **12 tareas falladas reportadas por agotamiento de intentos** residen en Supabase remoto (proyecto `vnzyecnbdqbfuxawzrda`, citado en `docs/nuva-agency/T-134-INVESTIGACION-BLOQUEOS.md`). No hay credenciales ni conexión a Supabase en este entorno, por lo que no se pudo consultar `agency_tasks` ni `agency_agent_leases` en producción. La consulta de confirmación es el punto 2 de la sección 10.

---

## 2. Cómo funciona el plano de control (lo que garantiza y lo que no)

### Tablas relevantes (`supabase/migrations/20261007000000_durable_autonomous_agency_control_plane.sql`)

| Tabla | Estados clave |
|---|---|
| `agency_tasks` | `queued`, `claimed`, `running`, `blocked`, `waiting_approval`, `completed`, `failed`, `cancelled`; `attempt_count` (default 0), `max_attempts` (default 3, check 1–20), `next_retry_at`, `depends_on` |
| `agency_agent_leases` | `active`, `released`, `expired`; `heartbeat_at`, `expires_tal`; índice único parcial `(task_id) WHERE status='active'` |
| `agency_missions` | `queued`, `planning`, `running`, `blocked`, `paused`, `completed`, `cancelled`, `failed` |

### RPCs

- **`agency_claim_task(p_agent_id, p_lease_seconds)`**: marca leases expirados (`expires_at < now`) como `expired`; libera tareas `claimed`/`running` huérfanas (sin lease activo) volviéndolas a `queued`; selecciona **una** tarea con `FOR UPDATE SKIP LOCKED LIMIT 1` donde `status IN ('queued','failed')`, `next_retry_at <= now`, `attempt_count < max_attempts` y dependencias completadas; incrementa `attempt_count`, crea lease `active`, emite evento `task.claimed`. Devuelve `null` si no hay nada reclamable. **Esto es la atomicidad del claim: dos workers nunca obtienen la misma tarea.**
- **`agency_heartbeat(p_lease_token, p_extend_seconds)`**: extiende el lease solo si está `active` y no expirado (clamp 60s–21600s); pone la tarea en `running`; devuelve `false` si el lease no existe o ya expiró.
- **`agency_finish_task(p_lease_token, p_status, ...)`**: bloquea lease con `FOR UPDATE`; si `status='failed'` y `attempt_count < max_attempts` devuelve la tarea a `queued` con backoff exponencial `next_retry_at = now + least(3600, 30 * 2^attempt_count)`; en caso contrario fija estado final, libera el lease (`released`) y emite evento `task.<estado>`. Un `finish_task` duplicado sobre lease ya liberado devuelve `false` → **idempotente contra doble finalización**.

### Lo que NO existe actualmente
- Worker dedicado de limpieza de leases: los leases expirados solo se marcan `expired` dentro de `claim_task`. Un worker que muere dejando una tarea `claimed` bloquea esa tarea hasta el TTL del lease (1800 s en el worker duradero; 21600 s por defecto en la Edge Function).
- Tabla dead-letter explícita: una tarea con `attempt_count >= max_attempts` queda como `failed` con el payload de error y evento `task.recovery_exhausted` (implícito vía `agency_claim_task` que deja de ofrecerla y `finish_task` que no la reingresa). Revisión del propietario requerida para reingresarla.

---

## 3. Evidencia de tareas fallidas (disponible localmente)

Extraído de `logs/cycles/index.json` (170 ejecuciones):

- **T-138**: 32 ejecuciones `FAIL`, ventana `2026-11-03T21:56:15.070Z` → `2026-11-04T01:29:19.622Z`, cadencia ~5–6 min → agotamiento de intentos por reintentos acotados.
- **T-21**: 2 `FAIL`; **T-20**: 1 `FAIL`; **T-10**: 1 `FAIL`.
- Totales: 88 PASS, 36 FAIL, 29 WARN, 17 BLOCKED.

Supervisor (`logs/supervisor/supervisor-2026-11-04.log`, `supervisor-2026-11-05.log`): ciclos del scheduler fallando `exitCode=1` cíclicamente (aprox. cada 6–12 min), una colisión de lock ("Otra instancia del ejecutor ya está en curso").

**Las 12 tareas falladas del reporte** están en `agency_tasks` de Supabase remoto (estado `failed`, error relacionado con agotamiento de intentos, evento `task.recovery_exhausted`). Sin token de Supabase no se pudieron listar; ver sección 10, punto 1.

Las 6 bitácoras de misión locales (`logs/missions/m-*.json`) están todas `completed` o con tareas `blocked` sin `attempt_count` (backlog local, no plano Supabase).

---

## 4. Leases: activos, vencidos, liberados

- **Activo:** lease creado por `claim_task`; `heartbeat` lo extiende (máx. 21600 s = 6 h; mín. 60 s).
- **Vencido:** `expires_at < now`; `claim_task` lo marca `expired` y la tarea vuelve a `queued` si no tiene otro lease activo.
- **Liberado:** `finish_task` pone el lease en `released` al finalizar la tarea.
- **Riesgo:** lease `active` de worker caído mantiene la tarea en `claimed`/`running` hasta el TTL; no hay limpieza proactiva fuera de `claim_task`.

---

## 5. Verificación de atomicidad del claim y exclusión mutua

1. `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1` en `agency_claim_task`: dos workers concurrentes saltan filas bloqueadas y nunca reclaman la misma tarea.
2. Índice único parcial `agency_agent_leases_active_task_idx (task_id) WHERE status='active'`: imposible tener dos leases `active` sobre una misma tarea.
3. `finish_task` bloquea el lease con `FOR UPDATE` y valida `status='active'` y el token: doble finish de un mismo worker o de un worker ajeno falla (`false`).
4. `claim_task` libera tareas `claimed`/`running` cuyo lease ya no está activo ni expirado (huérfanos) → las devuelve a `queued` para otro worker.

**Conclusión:** el plano de control SQL impide que dos workers ejecuten el mismo trabajo, siempre que se usen las RPC (no escritura directa en las tablas).

---

## 6. Loop infinito con cola vacía — verificación de PR #274

### Bug (presente en rama actual y en working tree)

En `supabase/functions/nuva-agency-worker-control/index.ts` (líneas 82–91) y `src/routes/api/owner/agency-control.ts` (bloque equivalente), `claim_task`:

1. Llama `agency_claim_task`; si devuelve `null` (cola vacía)…
2. Busca una misión `durable-autonomous-agency` y **inserta** una tarea `Autonomous <agentId> cycle`.
3. Vuelve a llamar `agency_claim_task` para reclamarla.

Resultado: un worker sin trabajo se autogenera trabajo eternamente. Cada nueva tarea consume un intento (`attempt_count`) y, si falla, se reingresa con backoff → el scheduler se dispara cíclicamente (coherente con las alertas repetitivas observadas).

### PR #274 — verificación del diff

`git diff t-27-constructor-prep...pr-274` (3 archivos, +20/−31):

- `supabase/functions/nuva-agency-worker-control/index.ts`: elimina las líneas 82–91; `claim_task` ahora devuelve `claimed: initialData ?? null` con comentario "An empty queue is an idle worker, not permission to manufacture another task."
- `src/routes/api/owner/agency-control.ts`: misma eliminación en la ruta local.
- `src/lib/agency/empty-queue.test.mjs` (nuevo, 14 líneas): prueba de cola vacía.

**Veredicto: PR #274 resuelve el loop infinito de generación de tareas cuando la cola está vacía en el plano de control Supabase.** Pendiente: merge a main + despliegue de la Edge Function (acciones del owner, sección 10).

### Riesgos residuales no cubiertos por PR #274

1. `scripts/agency-generate-tasks.mjs` paso 7: genera tareas de mejora continua cuando el backlog local está vacío (dedup por título existente; acotado al backlog).
2. `scripts/agency-task-executor.mjs` bucle `while (true)` (línea 447): en `batch-complete` sin `nextTask`, reinvoca `agency-generate-tasks.mjs` y continúa el bucle (líneas 489–528). Acotado por `maxTasks`/`maxMs` del batch; no afecta a la cola Supabase.

Ambos son del plano local de backlog y de menor riesgo, pero conviene revisarlos antes de activar el worker duradero en producción para no reintroducir generación no intencional.

---

## 7. Diferenciar cola vacía de misión activa

| Señal | Cola vacía | Misión activa |
|---|---|---|
| `agency_claim_task` | devuelve `null` (sin tarea reclamable para ese agent) | devuelve tarea + lease |
| `agency_missions.status` | `queued` / `planning` | `running` (o `blocked` / `paused`) |
| `agency_agent_leases` | sin leases `active` para ese agent | lease `active` con `heartbeat_at` reciente |
| Scheduler heartbeat | `logs/scheduler/heartbeat.json` con `lastBeat` viejo o ausente | `lastBeat` dentro del TTL (10 min) |

Una cola vacía para un worker no significa que no haya misión en ejecución; distinguir por `mission.status = 'running'` + lease activo + heartbeat reciente antes de declarar ocioso el sistema.

---

## 8. Dead-letter handling y revisión del propietario

Flujo actual de una tarea fallida:

1. Especialista devuelve `FAIL` → `finish_task(status='failed')`.
2. Si `attempt_count < max_attempts`: vuelve a `queued` con `next_retry_at` (backoff exponencial, tope 1 h).
3. Si `attempt_count >= max_attempts`: queda en `failed` con `error` (payload del resultado) y evento `task.failed` de nivel `error`. `agency_claim_task` ya no la selecciona (`attempt_count < max_attempts` falla). **No hay reintento automático tras `failed` final.**

Esto funciona como dead-letter implícito. Falta:
- Consulta/listado explícito de tareas en `failed` por `max_attempts_exhausted` (código de error a estandarizar en `error`).
- Procedimiento de revisión del propietario para decidir reingreso (`status='queued'`, `attempt_count` reset, `next_retry_at=null`) vs descarte definitivo.

---

## 9. Plan de recuperación seguro

**Regla de oro:** no mutar tareas productivas (`agency_tasks`, `agency_agent_leases`, `agency_missions` en Supabase remoto) sin (a) verificar idempotencia de la operación, (b) ejecutar primero en preview/staging, (c) tener SELECT de antes/después, y (d) aprobación del owner (sección 10).

### Fase 0 — Diagnóstico (sin mutar, requiere token de Supabase)
1. `SELECT id, title, status, attempt_count, max_attempts, error, next_retry_at FROM agency_tasks WHERE status='failed'` → confirmar las 12 tareas por agotamiento de intentos.
2. `SELECT id, task_id, agent_id, status, heartbeat_at, expires_at FROM agency_agent_leases WHERE status='active' AND expires_at < now()` → leases vencidos no liberados.
3. `SELECT ... WHERE status IN ('claimed','running')` → tareas bloqueadas en claim (posibles workers muertos).
4. `SELECT * FROM agency_events WHERE event_type LIKE '%recovery_exhausted%' ORDER BY created_at DESC` → historial de agotamiento.

### Fase 1 — Liberar leases vencidos (mutación productiva, requiere aprobación)
- `UPDATE agency_agent_leases SET status='expired', released_at=now() WHERE status='active' AND expires_at < now()` — idempotente (afecta solo leases vencidos; reejecutar no cambia nada).
- `UPDATE agency_tasks SET status='queued', lease_id=NULL, updated_at=now() WHERE status IN ('claimed','running') AND (lease_id IS NULL OR NOT EXISTS lease activo no expirado)` — idempotente (solo huérfanos).

### Fase 2 — Reingreso controlado de tareas fallidas (por tarea, requiere aprobación)
Por cada tarea de las 12, tras revisión del owner:
- `UPDATE agency_tasks SET status='queued', attempt_count=<n>, next_retry_at=NULL, updated_at=now() WHERE id=<id> AND status='failed'` — solo si el owner valida que la causa raíz se corrigió. Ejecutar una a una y verificar con SELECT.

### Fase 3 — Desplegar el fix de generación infinita
- Merge PR #274 a main y desplegar Edge Function `nuva-agency-worker-control` (sección 10, puntos 3–4).

### Fase 4 — Reanudar operación
- Verificar `agency_claim_task` devuelve `null` en cola vacía (sin crear tarea `Autonomous cycle`).
- Arrancar scheduler/durable worker con leaseSeconds acotado y heartbeat activo; supervisar que no reaparezcan `FAIL` repetidos de la misma tarea.

### Rollback
- Todas las mutaciones de Fase 1–2 son reversibles volviendo a los valores capturados en el SELECT de diagnóstico (guardar antes de mutar). No hay cambios de esquema.

---

## 10. Acciones que requieren aprobación del owner (mutaciones productivas)

| # | Acción | Por qué requiere owner | Referencia |
|---|---|---|---|
| 1 | Consultar `agency_tasks`/`agency_agent_leases` en Supabase remoto (proyecto `vnzyecnbdqbfuxawzrda`) para confirmar las 12 falladas y leases vencidos | Acceso a base de datos productiva | AGENT_POLICY: "No irreversible production database access"; token `sbp_` del owner |
| 2 | Aplicar migración de grants Supabase remoto (service_role en 6 tablas + secuencia, migración `a3fa219d` preparada localmente) | Mutación de grants productivos | T-134, punto "Qué requiere autorización" |
| 3 | Desplegar Edge Function `nuva-agency-worker-control` v17+ (hardening OIDC, PR #252) | Despliegue a producción/preview | T-134 / PR #252 |
| 4 | **Merge PR #274 a main** (elimina loop infinito de generación con cola vacía) | Merge a rama principal | PR #274 no está mergeado |
| 5 | Release de leases vencidos y liberación de tareas `claimed`/`running` huérfanas (Fase 1) | Mutación de datos productivos | Requiere verificación de idempotencia + owner |
| 6 | Reingreso a `queued` / reset de `attempt_count` de las 12 tareas fallidas (Fase 2) | Mutación de tareas productivas | Solo tras revisión del owner por tarea |
| 7 | Activar workflow GitHub `nuva-agency-durable-worker.yml` | Segundo scheduler compitiendo con el local | T-134 |

### Qué NO requiere aprobación (ejecutable sin owner)
- Análisis de logs locales, documentación, preparación de scripts SQL de recuperación, verificación del diff de PR #274, ejecución del scheduler/executor en entorno local no productivo.

---

## 11. Próximos pasos (pendiente de decisión del owner)

1. Entregar token de Supabase / acceso al proyecto `vnzyecnbdqbfuxawzrda` para ejecutar el diagnóstico de Fase 0 y confirmar las 12 tareas falladas.
2. Autorizar merge de PR #274 y despliegue de la Edge Function con el fix.
3. Autorizar ejecuciones de Fase 1–2 (una a una, con verificación de idempotencia).
4. Revisar `scripts/agency-task-executor.mjs` (bucle `while(true)`) y `scripts/agency-generate-tasks.mjs` (paso 7) antes de activar el worker duradero en producción.
