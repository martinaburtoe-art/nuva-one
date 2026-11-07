# T-134 — Investigación de bloqueos de Agency (Supabase)

**Estado:** investigado y documentado  
**Especialista:** Orchestrator  
**Dependencias investigadas:** T-20, T-21, T-22, T-27, T-28, T-32  
**Fecha:** 2026-11-07  
**Rama:** `integ/agency-272-274`

## Hallazgo raíz común

Todas las tareas bloqueadas dependen de Supabase y ninguna puede avanzar sin uno o más de estos tres recursos que faltan:

1. **Credenciales de entorno no configuradas:** `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` no están definidas en el entorno server-side. `.env.local` existe pero no se lee por política de secretos (no se exponen valores). `agency-integrations-check.mjs` confirma `credentialsConfigured: false` para Supabase.
2. **Grants de `service_role` no aplicados remotamente:** la migración `20261030130000_agency_service_role_privileges.sql` (T-29) está preparada localmente y concede privilegios mínimos (`select/insert/update` sobre `agency_missions`, `agency_tasks`, etc.) a `service_role`, manteniendo RLS habilitado, pero **no se ha aplicado en el proyecto remoto**. Sin ella, el worker no puede reclamar/terminar tareas ni registrar eventos.
3. **Autorización de deploy pendiente:** el endurecimiento OIDC de la Edge Function `nuva-agency-worker-control` (T-31) está preparado en código con tests, pero la versión desplegada sigue en v16 (valida solo issuer, repository, run_id, agent_id). Desplegar requiere autorización expresa (T-32).

## Estado por tarea bloqueada

| Tarea | Título | Prioridad | Estado | Qué falta | Bloqueante principal |
|-------|--------|-----------|--------|-----------|----------------------|
| T-20 | Persistencia durable de Agency en Supabase | P0 | BLOQUEADO | Grants `service_role` en 6 tablas + secuencia; credenciales de entorno | Migración T-29 no aplicada remotamente + no hay `SUPABASE_URL`/`SERVICE_ROLE_KEY` |
| T-21 | Scheduler durable de Agency | P0 | BLOQUEADO | T-20, T-31, T-32 | Cadena bloqueada por T-20 y despliegue OIDC |
| T-22 | Owner Console durable con autorización server-side | P1 | BLOQUEADO | T-20, T-21 | Sin persistencia ni scheduler duradero |
| T-27 | Recuperar la ejecución programada existente | P0 | BLOQUEADO | T-20, T-21, T-31, T-32 | Worker no puede reclamar tareas sin grants |
| T-28 | Verificar Owner Console con sesión real | P1 | BLOQUEADO | T-26, T-27, T-29 | Depende de tareas bloqueadas arriba |
| T-32 | Desplegar hardening OIDC en la Edge Function | P0 | BLOQUEADO | T-31, autorización de deploy | Requieren deploy explícito (prohibido sin autorización) |

## Alternativas que NO requieren deploy ni cambios en producción

1. **Persistencia local-only:** El ciclo de ejecución ya registra en `logs/cycles/` y `logs/executions/` (T-08, T-09, T-12 funcionan localmente). Seguir usando este mecanismo para trazabilidad mientras Supabase esté bloqueado.
2. **No introducir `service_role_key` en configuraciones ni archivos:** restricción del usuario respetada; no se crean archivos con credenciales.
3. **Documentar y esperar:** registrar el bloqueo, continuar con tareas independientes no dependientes de Supabase, y volver a T-20..T-32 cuando el usuario autorice deploy y/o proporcione credenciales de entorno.
4. **No aplicar migraciones remotas ni cambiar RLS:** restricción respetada; la migración T-29 permanece preparada localmente sin aplicarse.

## Camino propuesto para desbloquear

1. El usuario autoriza el deploy de la Edge Function endurecida (T-31 → T-32) y/o proporciona credenciales de entorno `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`.
2. Se aplica la migración T-29 (`20261030130000_agency_service_role_privileges.sql`) en el proyecto remoto (solo grants, sin cambiar RLS).
3. Una vez resueltos T-20 y T-32, se desbloquean en cadena T-21, T-22, T-27, T-28.
4. Re-ejecutar `agency-integrations-check.mjs` para confirmar `credentialsConfigured: true` y reintentar el ciclo de Agency.

## Seguridad

- No se leyeron ni expusieron valores de `.env.local`.
- No se aplicó ninguna migración remotamente.
- No se cambió RLS ni permisos de producción.
- No se introdujo `service_role_key` en nuevos archivos ni configuraciones.
