# Nüva People — propuesta de endurecimiento de acceso sensible

## Estado
Propuesta versionada en una rama de revisión. **No aplicada a Supabase ni a producción.** La migración debe aprobarse y probarse antes de fusionarse.

## Decisión de autorización
- Remuneraciones, cálculos e insumos de nómina, liquidaciones, contratos completos, documentos, LRE, expedientes de Ley Karin, ausencias, solicitudes de permisos, cumplimiento y saldos de vacaciones: acceso por fila limitado a miembros con rol `owner` o `admin` en la empresa correspondiente.
- `people_employees`: acceso completo sólo para `owner`/`admin`. El personal con acceso de miembro recibe una vista operacional explícita, `people_employee_operational`, que excluye identificador nacional, contacto, datos bancarios, salud/previsión y remuneraciones.
- Se conservan sólo las operaciones de escritura que ya existían en las políticas de cada tabla, pero se restringen a `owner`/`admin`; no se añaden operaciones nuevas deliberadamente.
- Las tablas de parámetros legales públicos (por ejemplo AFP, feriados y parámetros legales) no se incluyen en esta restricción.

## Archivos
- `supabase/migrations/20261022090000_nuva_people_sensitive_access_hardening.sql`
- `supabase/tests/database/112_people_sensitive_access_hardening.sql`

## Riesgo de compatibilidad que requiere trabajo de aplicación
La migración no modifica componentes frontend. Cualquier pantalla que hoy lea directamente columnas sensibles de `people_employees` debe comprobar el rol y, para personal operativo, migrar su lectura a `people_employee_operational`. Las pantallas de nómina/contratos/documentos/LRE deben estar disponibles sólo a propietarios y administradores. La migración no debe desplegarse hasta completar esa revisión y validar flujos reales.

## Validación requerida
1. Ejecutar el test pgTAP 112 en una base local/efímera con todas las migraciones aplicadas.
2. Añadir pruebas de integración autenticadas para owner, admin, staff, viewer y usuario de otra empresa; verificar lectura y escritura permitidas/denegadas.
3. Probar onboarding, asistencia, permisos, cálculo/cierre de nómina, emisión de liquidaciones, contratos, documentos, LRE y auditoría.
4. Revisar las llamadas frontend/RPC y las políticas preexistentes antes de fusionar.
5. Sólo tras aprobación explícita, aplicar la migración en un entorno no productivo y promoverla por el proceso de release.

## Limitaciones de la suite incluida
La prueba pgTAP valida el catálogo de políticas, RLS y el contrato de la vista. No sustituye las pruebas end-to-end de sesión/roles ni certifica el comportamiento visual del frontend. No se ejecutó contra producción.

## Revisión técnica (2026-10-22 — JARVIS / Hermes Agent)

### Corrección aplicada a esta propuesta
- **Causa raíz del fallo de CI** (`pgTAP database tests` → `999_security_invariants.sql` test 1): el invariant del repositorio exige `security_invoker=true` en TODA vista client-exposed; la vista original usaba `security_barrier` con predicado explícito.
- **Fix**: la proyección segura pasó a una función `private.people_employee_operational_rows(uuid)` (`STABLE SECURITY DEFINER`, `search_path=public`, filtro `is_business_member` por el uid DEL LLAMANTE pasado como argumento, lista fija de columnas operativas) y la vista es ahora `security_invoker=true` sobre esa función. El invariant queda intacto (no se debilita el gate) y el directorio operativo de staff sigue funcionando. `GRANT EXECUTE` sólo a `authenticated`; `REVOKE` de `anon`.
- Suite pgTAP renumerada 112 → **115** (el 112 ya estaba tomado por `112_core_integrity_gate.sql`) y extendida a 61 aserciones: vista delega en la función, la función exige membresía, es STABLE SECURITY DEFINER, y la vista cumple security_invoker.

### Verificaciones adicionales de la revisión
- **RPC bypass: cerrado.** `calculate_people_payroll_period`, `generate_people_liquidations` y `review_people_leave_request` ya están endurecidos en migraciones previas (`SECURITY INVOKER`/`DEFINER` con `has_business_role(..., owner, admin)` explícito). El endurecimiento de tablas no es burlable por esas vías.
- **El propio test 115 pasó en CI** contra la cadena completa de migraciones en base efímera (evidencia: run 39720477452, `112_people_sensitive_access_hardening.sql ... ok`); sólo el invariant de vistas fallaba.

### Riesgos y trabajo pendiente ANTES de aprobar (bloqueantes de fusión)
1. **Impacto UX staff**: `people_absences`, `people_leave_requests`, `people_vacation_balances` pasan de SELECT miembro-amplio a owner/admin. Las pantallas de ciclo de vida (`people-lifecycle.tsx`) mostrarán listas vacías para staff/viewer hasta que el frontend consulte la vista operativa o se definan vistas operativas equivalentes para esas tablas. Requiere PR de frontend acompañante.
2. **Cobertura incompleta del módulo**: `people_attendance_events`, `people_org_units` y `people_requests` NO están en las 18 tablas. Attendance necesita un diseño operativo (staff la registra); proponer follow-up.
3. **Drift detectado**: el RPC `people_dashboard_summary` (y `finance_dashboard_summary`) se invocan desde el frontend pero NO existen en ninguna migración versionada — o fueron creados fuera de banda o no existen. Verificar con acceso a la BD y versionar.
4. Las pruebas autenticadas end-to-end por rol (owner/admin/staff/viewer/otra empresa) siguen pendientes — la suite actual es de catálogo, no de comportamiento con sesión.
