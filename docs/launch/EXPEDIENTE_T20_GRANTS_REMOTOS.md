# Expediente T-20 — Migración de grants remotos Supabase

**Estado:** Preparado para autorización del propietario. No ejecutado.  
**Bloquea:** T-21, T-22, T-27, T-28.

## Objeto
Aplicar la migración remota `supabase/migrations/20261030130000_agency_service_role_privileges.sql` al proyecto Supabase vinculado `vnzyecnbdqbfuxawzrda` (ACTIVE_HEALTHY), otorgando privilegios de service_role a la capa de agencia autónoma.

## Por qué requiere autorización
- Modifica privilegios remotos de base de datos de producción.
- Requiere `supabase login` (credenciales del owner) y `supabase migration apply --linked`.
- No es reversible automáticamente: el rollback requeriría una migración adicional.

## Archivo de migración
`supabase/migrations/20261030130000_agency_service_role_privileges.sql` (1,349 chars).

## Procedimiento de ejecución
1. `supabase login` (credenciales del owner, no compartidas en chat).
2. `supabase migration apply --linked` en `C:/Users/marti/Documents/nuva-one`.
3. Verificar que la migración se aplicó sin error.
4. Verificar que las 6 Edge Functions remotas pueden acceder a las tablas de agencia.

## Procedimiento de rollback
No hay migración de reversión preparada. En caso de fallo:
1. Revisar `supabase migration list` para confirmar el estado.
2. Evaluar migración de reversión manual caso por caso.
3. Notificar al owner antes de cualquier cambio adicional.

## Qué se necesita del owner
- Autorización explícita para `supabase login` + `migration apply --linked`.
- Credenciales de Supabase (no solicitar por chat; usar el flujo de autorización del sistema).
- Confirmación de que el proyecto `vnzyecnbdqbfuxawzrda` es el destino correcto.

## Evidencia
- Migración local revisada y presente en el repositorio.
- Proyecto remoto vinculado, ACTIVE_HEALTHY.
- CLI v2.122.0 disponible, no logueado.
