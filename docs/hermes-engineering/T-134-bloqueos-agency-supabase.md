# T-134 — Investigación de bloqueos de Agency (Supabase)

**Estado:** investigado; estado remoto corregido con evidencia actual  
**Fecha de verificación:** 2026-11-07  
**Proyecto:** `vnzyecnbdqbfuxawzrda` (Nüva One)  
**Rama:** `integ/agency-272-274`

## Hechos verificados en el proyecto remoto

1. **Los grants de Agency ya tienen una migración registrada como aplicada.** El historial remoto de Supabase incluye `20261103022653 agency_service_role_privileges`. No se debe documentar T-29 como pendiente ni volver a aplicar esa migración. El historial fue consultado; no se ejecutó ninguna migración.
2. **La Edge Function `nuva-agency-worker-control` está ACTIVE en versión 16.** La verificación OIDC/hardening prevista para T-31/T-32 no se considera desplegada por esta evidencia. No se hizo deploy.
3. **Las credenciales locales del runner no quedan verificadas por una consulta remota.** Este documento no afirma que `SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY` estén ausentes: ese dato debe obtenerse ejecutando el diagnóstico de solo lectura en el entorno local de Hermes, sin mostrar valores secretos.

## Estado corregido por tarea

| Tarea | Estado | Bloqueo que sí está sustentado |
|---|---|---|
| T-20 — Persistencia durable | UNKNOWN / pendiente de verificación local | Confirmar desde el runner si las credenciales requeridas están disponibles y probar el flujo autorizado de lectura/escritura de Agency. No atribuir el bloqueo a T-29. |
| T-21 — Scheduler durable | BLOQUEADO | Depende de T-20 y de validar la cadena de ejecución durable. |
| T-22 — Owner Console durable | BLOQUEADO | Depende de la persistencia y del scheduler durable. |
| T-27 — Recuperar ejecución programada | BLOQUEADO | Requiere verificar el worker y su acceso efectivo al control plane. |
| T-28 — Owner Console con sesión real | BLOQUEADO | Requiere completar y validar la cadena T-20/T-27. |
| T-31/T-32 — Hardening OIDC y deploy | BLOQUEADO | La función remota continúa en v16; el despliegue no se ha autorizado ni ejecutado en esta revisión. |

## Próximos pasos seguros

1. Ejecutar `node scripts/agency-integrations-check.mjs` desde el repositorio local y revisar únicamente los estados redactados; nunca copiar valores de secretos.
2. Contrastar las credenciales detectadas con el entorno que realmente ejecuta el worker. No inferir que la presencia de un archivo local implica que el runner lo carga.
3. Revisar el diff y las pruebas de T-31 antes de solicitar autorización para cualquier despliegue.
4. Retomar T-20/T-21/T-27 solo después de verificar el acceso efectivo al control plane.

## Límites de esta verificación

- Se consultó el historial remoto de migraciones y el listado de Edge Functions.
- No se aplicaron migraciones ni se ejecutaron escrituras en Supabase.
- No se modificó RLS, grants ni datos.
- No se desplegó ninguna Edge Function.
- No se leyeron ni expusieron valores de secretos locales.
