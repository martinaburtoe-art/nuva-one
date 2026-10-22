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
