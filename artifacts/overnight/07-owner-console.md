# 07-owner-console.md — Owner Console de Nüva Agency

**SHA certificado:** `6b8d5d97`
**Fecha:** 2026-10-31T04:45:00 (UTC-03)

## Rutas implementadas

| Ruta | Método | Función | Auth | Backend |
|---|---|---|---|---|
| `/api/owner/agency-control` | GET | Panel: misiones, tareas, eventos, leases, approvals, artifacts | owner (`platform_role === "owner"`) | Supabase |
| `/api/owner/agency-control` | POST | claim_task, heartbeat, finish_task, event, delegate, create_mission, mission_status, approval | worker (GitHub token + run de confianza) o owner | Supabase RPCs (`agency_claim_task`, `agency_heartbeat`, `agency_finish_task`) |
| `/api/owner/agency-execute` | POST | Ejecutar tarea del backlog (`--task=T-####`) o dry-run | owner | `execFile` de `agency-task-executor.mjs`, timeout 120s |
| `/api/owner/agency-logs` | GET | Ejecuciones y ciclos con resumen (PASS/FAIL/ERROR conteos) | owner | Supabase o fallback local (`logs/executions/`, `logs/cycles/`) |
| `/api/owner/agency-status` | GET/POST | Actividad de GitHub Actions, vista durable, cambio de estado de misión, aprobaciones | owner | GitHub API + Supabase |

## Seguridad

- Autenticación real: JWT de Supabase validado server-side; rol `platform_role === "owner"`; sin token → 401; token inválido o no-owner → 403.
- Sin contraseña fija ni bypass de frontend.
- Validación de inputs: IDs de tarea con regex, prioridad 1-100, estados restringidos, precondición `pending` para aprobaciones.
- Auditoría de acciones: eventos en `agency_events` con `decided_by`, `decided_at`, `owner_user_id`.

## Pruebas de seguridad (diseño)

| Escenario | Resultado esperado | Estado |
|---|---|---|
| Sin token | 401 AGENCY_ACCESS_DENIED | implementado |
| Token inválido | 401 (getUser falla) | implementado |
| Usuario no propietario | 403 (platform_role !== owner) | implementado |
| Propietario válido | 200 + datos del panel | implementado (pendiente de Supabase) |
| Acción autorizada | 200 + efecto en BD | implementado (pendiente de Supabase) |
| Acción no autorizada | 403 | implementado |

## Limitación documentada

End-to-end no verificable sin `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (bloqueo B-002). Las rutas se inician y rechazan sin credenciales con errores claros (`AGENCY_SERVICE_ROLE_UNAVAILABLE`, `AGENCY_DURABLE_STORAGE_NOT_CONFIGURED`, 503), sin exponer credenciales.

El fallback a logs locales (`agency-logs.ts` source: `local-logs`) opera sin Supabase y está verificado por la ejecución de `logs/missions/` y `logs/cycles/`.

## Veredicto

**Owner Console implementada con autenticación y autorización server-side.** Operativa end-to-end pendiente de credenciales Supabase (B-002).
