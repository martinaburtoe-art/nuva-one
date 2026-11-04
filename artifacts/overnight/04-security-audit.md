# 04-security-audit.md — Auditoría de seguridad y gobernanza de Nüva Agency

**SHA certificado:** `6b8d5d97`
**Fecha:** 2026-10-31T04:45:00 (UTC-03)

## Alcance

Autorización, autenticación, RLS, secretos, inyección, validación de inputs, SSRF, ejecución de procesos, logs, datos sensibles, escalamiento de privilegios, repetición de solicitudes, idempotencia, rate limiting, auditoría.

## Hallazgos

### PASS — controles implementados

| Área | Control | Evidencia |
|---|---|---|
| Autenticación Owner Console | JWT válido vía Supabase; `platform_role === "owner"` requerido; sin token o token inválido → 401; no-owner → 403 | `src/routes/api/owner/agency-control.ts` (`owner()`), `agency-execute.ts`, `agency-logs.ts`, `agency-status.ts` (`authorizeAgencyOwner`) |
| Autenticación worker duradero | GitHub token ≥ 10 chars + `x-agency-run-id` numérico + `x-agency-agent-id` en AGENTS; validación de run de confianza vía `isTrustedAgencyWorkerRun` contra GitHub API | `agency-control.ts` (`worker()`), `agency-durable-worker.mjs` |
| Autorización por acción | `claim_task`/`heartbeat`/`finish_task`/`event`/`delegate` requieren worker; `create_mission`/`mission_status`/`approval` requieren owner | `agency-control.ts` POST (línea 71-73) |
| Validación de lease | `leaseSeconds` 60-21600 entero; `leaseToken` 16-256 chars; `extendSeconds` 60-3600; estados terminales restringidos | `agency-control.ts` líneas 81-121 |
| Ejecución de procesos | `agency-execute.ts` valida `--task` con regex `^T-\d{1,4}$` y `--dry-run` booleano; `execFile` con argv array (no shell), timeout 120s | `agency-execute.ts` líneas 27-35, 38-67 |
| Creación de misión desde consola | Título 3-120, objetivo 10-4000, prioridad 1-100, 1-13 tareas, agentId entre los 13 válidos, depende_on siempre [] (sin dependencias cruzadas desde consola) | `agency-status.ts` POST `create_mission` (líneas 231-286) |
| Aprobaciones | Solo `approved`/`rejected`, `decided_by` registrado, estado `pending` como precondition (evita doble decisión), evento de auditoría | `agency-control.ts` (líneas 164-169) y `agency-status.ts` (líneas 310-332) |
| Secretos no expuestos | Ningún valor de token/key impreso; logs usan `[REDACTED]` convención; `agency-persist-supabase.mjs` nunca registra credenciales | revisión de código |
| Persistencia segura | UUIDs estables derivados (SHA-256) en lugar de IDs expuestos; `persistCycle`/`persistExecution`/`finalizeMission` con upsert por id | `scripts/agency-persist-supabase.mjs` |
| Worker duradero HTTPS-only | `NUVA_AGENCY_API_BASE_URL` debe ser https:// excepto localhost/127.0.0.1 | `agency-durable-worker.mjs` líneas 34-36 |

### WARN — controles condicionales

| Área | Hallazgo | Limitación |
|---|---|---|
| RLS / Supabase | Las tablas `agency_*` existen en migración `20261007000000_durable_autonomous_agency_control_plane.sql`, pero RLS no pudo audenciarse sin conexión al proyecto `vnzyecnbdqbfuxawzrda` | Bloqueo B-002: sin `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` no se verifica RLS remoto ni se aplican cambios (no autorizado) |
| Rate limiting | No se identificó rate limiting explícito en rutas de Agency | Depende de la capa de red/Vercel; no implementado a nivel de ruta |
| pgTAP | Pruebas de base no ejecutadas (requieren Supabase) | Bloqueo B-002 |

### BLOCKED — sin evidencia remota

- Conexión a Supabase proyecto `vnzyecnbdqbfuxawzrda`: credenciales no configuradas en entorno local. No se writes a producción, no se aplican migraciones remotas, no se modifican RLS. Todo lo que requiere Supabase queda documentado como bloqueo (ver 08-blockers.md).

## Reglas de los agentes respetadas

Los agentes no pueden: cambiar roles, modificar permisos, aplicar migraciones, desplegar producción, eliminar datos críticos, acceder a datos ajenos a su función, ni ejecutar acciones sensibles sin aprobación. El propietario conserva control final (auth `platform_role === "owner"`). Las acciones de alto impacto (misión, pausa, cancelación, aprobación) pasan por el sistema de aprobaciones de `agency_approvals`.

## Veredicto

**Sin bypasses ni vulnerabilidades críticas identificadas en el código local.** Los controles de autenticación y autorización están implementados server-side. Veredicto remoto pendiente de credenciales Supabase (B-002).
