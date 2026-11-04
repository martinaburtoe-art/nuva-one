# T-31 / T-40 — Endurecimiento OIDC del worker de Agency: estado, brechas y permisos requeridos

**Especialista:** Security / Release
**Estado:** EN_CURSO (documentación); despliegue remoto BLOQUEADO pendiente autorización de owner
**Riesgo:** Bajo (documentación solamente; no se aplica ni se despliega nada)
**Autorización requerida:** No (documentación). Sí para aplicar/desplegar.

---

## 1. Objetivo

La Edge Function `nuva-agency-worker-control` debe rechazar cualquier token de GitHub Actions OIDC que no cumpla estrictamente la identidad del worker de Nüva Agency, antes de que el worker durable pueda reclamar, hacer heartbeat o finalizar tareas de forma remota.

## 2. Código endurecido (local, listo, commit e28f67e)

Archivos preparados en rama `fix/reproducible-npm-ci-20261027`:

| Archivo | Contenido clave |
|---|---|
| `supabase/functions/nuva-agency-worker-control/worker-claims.ts` | Constantes `AGENCY_WORKER_REPO`, `AGENCY_WORKER_OWNER`, `AGENCY_WORKER_AUDIENCE = "nuva-one-agency"`, `AGENCY_WORKER_WORKFLOW_REF` apuntando a `nuva-agent-durable-worker.yml@refs/heads/main`, `AGENCY_WORKER_AGENT_IDS` con los 13 agentes. Función `isTrustedAgencyWorkerClaims(payload, runId, agentId)` que valida: `aud`, `repository`, `repository_owner`, `run_id` numérico > 0, `ref === refs/heads/main`, `workflow_ref` exacto, `job_workflow_ref` igual o ausente, `actor === owner`, `event_name` en {schedule, workflow_dispatch, push}. |
| `supabase/functions/nuva-agency-worker-control/index.ts` | `authorize()` verifica header `x-agency-github-token` / `x-agency-oidc-token`, llama a `jwtVerify` con JWKS de `token.actions.githubusercontent.com`, audience `nuva-one-agency`, issuer `https://token.actions.githubusercontent.com`, y `isTrustedAgencyWorkerClaims`. Rechaza con `WORKER_OIDC_CLAIMS_DENIED`. |
| Pruebas | 14 tests (OIDC claims válidos / alterados) + `deno check` en CI. Commit `e28f67e`: OIDC hardening 14/14 PASS. |

## 3. Estado remoto (v16) — brecha de seguridad

La función desplegada actualmente en Supabase (versión 16) solo valida: `issuer`, `repository`, `run_id` y `agent_id`. **NO valida:** `audience`, `workflow_ref`, `ref`, `event_name` ni `actor`.

Consecuencia: un token OIDC de otro workflow/repositorio con el mismo `run_id` y `agent_id` podría pasar la autorización remota. El endurecimiento local no está vigente en producción hasta que se despliegue.

## 4. Permisos y operaciones requeridas para eliminar el bloqueo

| Operación | Qué cambia | Riesgo | Reversibilidad | Autorización |
|---|---|---|---|---|
| Desplegar `nuva-agency-worker-control` endurecido (v17) | Reemplaza v16 remota con código local que valida todo el conjunto de claims OIDC | Medio: si el workflow envía claims incompletos, el worker deja de reclamar tareas | Revertible: red desplegar v16 o versión anterior | Explícita del owner (despliegue de Edge Function crítica) |
| Aplicar migración T-20 / T-29 (grants service_role) | `service_role` obtiene privilegios sobre tablas `agency_*`; `anon`/`authenticated` quedan sin acceso | Medio: cambia privilegios de base de datos | Revertible: `REVOKE` explícito | Explícita del owner (migración productiva + cambios de permisos) |
| Desplegar Edge Function `platform-telemetry` (T-32) | Nueva función remota (7ª) | Bajo: función nueva, no toca existentes | Revertible: eliminar función | Explícita del owner |

## 5. Plan de reversión

- Edge Function: desplegar la versión anterior (v16) desde Supabase CLI o panel; mantendría validación parcial hasta decidir siguiente paso.
- Grants service_role: ejecutar `REVOKE ALL` sobre `agency_*` y secuencia `agency_events_id_seq` de `anon`, `authenticated`; volver a conceder solo lo estrictamente necesario según `20261030130000_agency_service_role_privileges.sql`.

## 6. Qué NO se hace sin autorización explícita

- No desplegar Edge Functions remotas.
- No aplicar migraciones en Supabase remoto.
- No modificar RLS ni permisos críticos de producción.
- No leer ni copiar secretos (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, etc.).

## 7. Criterios de aceptación de T-31 (cuando se autorice el despliegue)

- La versión desplegada rechaza tokens con `aud`, `workflow_ref`, `ref`, `actor`, `event_name`, `run_id` o `agent_id` no autorizados.
- Smoke real contra la función desplegada con token válido del workflow dedicado y con tokens inválidos.
- Logs de verificación sin exponer JWT.

## 8. Evidencia de esta sesión

- Código endurecido leído y verificado: `worker-claims.ts` (45 líneas), `index.ts` (147 líneas).
- 14 tests OIDC PASS reportados por especialista Security (commit e28f67e).
- Función remota confirmada en v16 (sin hardening completo).
- Sin cambios aplicados; sin secretos expuestos.
