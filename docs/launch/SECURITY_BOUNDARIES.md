# SECURITY_BOUNDARIES — Límites de seguridad y gobernanza

Fecha: 2026-11-03.

## Reglas de operación (del MASTER EXECUTION DIRECTIVE)

1. No exponer secretos, API keys privadas o credenciales sensibles al navegador ni al chat.
2. service_role key nunca se lee ni se muestra por el asistente; se gestiona vía .env.local configurado por el usuario.
3. No ejecutar migraciones destructivas ni cambios de datos de producción sin aprobación explícita.
4. No modificar RLS, auth, payments ni acceso para pasar pruebas.
5. No desplegar a producción sin autorización explícita.
6. No tocar ReciConti (proyecto qajygywlobkdhdatixtg).
7. Aplicar privilegios mínimos (principio de least privilege).
8. No eliminar controles de seguridad para hacer pasar pruebas.
9. Registro de auditoría para acciones administrativas en Owner Console.

## Estado de seguridad verificado

- PR #268 (test(people): strengthen per-table RLS assertions) — MERGED
- PR #257 (scan People artifacts for redacted PII) — MERGED
- RLS habilitado en las 6 tablas de agency (agency_migrations.sql)
- Funciones SECURITY DEFINER: agency_claim_task, agency_heartbeat, agency_finish_task con grant execute a service_role
- service_role tiene ALL en tablas de agency (concedido 2026-11-03 tras resolución B-002)

## Límites del asistente (JARVIS)

- Puede: inspeccionar repositorios, investigar y corregir errores, modificar código, crear ramas y commits, crear PRs, ejecutar pruebas, coordinar agentes, automatizar tareas reversibles, preparar documentación.
- Requiere aprobación adicional: migraciones destructivas, cambios de permisos críticos de producción, gastos/contrataciones, campañas pagadas, publicaciones externas, merge/despliegue de producción con cambios críticos, acciones irreversibles sobre datos de clientes.
