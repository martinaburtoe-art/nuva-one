# 05-durable-worker.md — Certificación del worker duradero de Nüva Agency

**SHA certificado:** `6b8d5d97`
**Fecha:** 2026-10-31T04:45:00 (UTC-03)

## Arquitectura

Flujo coherente único implementado entre `scripts/agency-durable-worker.mjs` y las rutas de la Owner Console:

1. **Claim de tarea** → POST `/api/owner/agency-control` con `action: "claim_task"`, `leaseSeconds` (1800 por defecto), auth worker (GitHub token + run de confianza). Respuesta: `claimed.task` + `claimed.lease.token`.
2. **Lease** → token de ≥16 chars devuelto por el servidor; validez 1800s.
3. **Ejecución** → `SPECIALISTS[agentId].execute(task)` con veredictos `PASS|WARN|FAIL|BLOCKED|UNKNOWN`; errores capturados → FAIL sin interrumpir el worker.
4. **Heartbeat** → implementado en la ruta `heartbeat` (extend lease); el worker actualiza estado vía API.
5. **Finalización** → `action: "finish_task"` con `leaseToken`, `status` (completed/failed/blocked/waiting_approval), resumen estructurado (evidence, errors, durationMs, timestamp).
6. **Reintentos** → gestionados por el executor/misión, no por el worker (una tarea por ejecución del worker).
7. **Recuperación** → el estado de misión se persiste tras cada lote; el scheduler recupera tras reinicio leyendo `logs/scheduler/state.json`.

## Pruebas ejecutadas

| Prueba | Comando | Resultado | Evidencia |
|---|---|---|---|
| Validación de configuración sin credenciales | `node scripts/agency-durable-worker.mjs` | **BLOCKED (esperado)** | `{"status":"failed","error":"NUVA_AGENCY_API_BASE_URL_REQUIRED"}` — falla rápido y de forma clara, sin inventar conexión |
| End-to-end claim/lease/heartbeat/finish | Contra `/api/owner/agency-control` | **BLOCKED** | Requiere `NUVA_AGENCY_API_BASE_URL` + `GITHUB_TOKEN` + Supabase backend (B-002); no se simuló |
| Persistencia local fallback | Misión `m-20261031-013348133` vía `agency-mission.mjs` | **PASS** | Estado persistido en `logs/missions/` tras cada lote; recuperable ante interrupción |

## Coherencia entre interfaces

- `agency-execute.ts` (Owner Console) ejecuta `scripts/agency-task-executor.mjs` — misma base que el worker duradero; no hay duplicidad de lógica de ejecución.
- `agency-durable-worker.mjs` no se presenta como durable sin backend: exige URL de API HTTPS y token; sin ellas falla con error explícito.

## Limitación documentada

Sin `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` la Owner Console API no opera, por lo que claim/lease/heartbeat/finish no son verificables end-to-end. La persistencia local FS (`logs/missions/`, `logs/executions/`, `logs/cycles/`) es operativa y verificada. El worker duradero queda listo para conectarse al backend cuando el propietario configure las credenciales.
