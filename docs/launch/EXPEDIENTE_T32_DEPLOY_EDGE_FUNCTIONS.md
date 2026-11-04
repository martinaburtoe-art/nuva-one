# Expediente T-32 — Deploy de Edge Functions a producción

**Estado:** Preparado para autorización del propietario. No ejecutado.  
**Bloquea:** (ninguna tarea adicional identificada; es requisito de cierre).

## Objeto
Desplegar las 7 Edge Functions locales al proyecto Supabase remoto `vnzyecnbdqbfuxawzrda`. Actualmente hay 6 desplegadas remoto; falta `platform-telemetry`.

## Por qué requiere autorización
- Despliegue a producción de funciones serverless.
- Requiere `supabase login` y `supabase functions deploy`.
- Requiere configurar variables de entorno remotas.
- Cambios en funciones expuestas afectan el comportamiento en producción.

## Archivos locales (7)
`supabase/functions/` — 7 Edge Functions.  
Remoto: 6 desplegadas (`platform-telemetry` ausente).

## Procedimiento de ejecución
1. `supabase login` (credenciales del owner).
2. `supabase functions deploy` en `C:/Users/marti/Documents/nuva-one`.
3. Configurar variables de entorno remotas faltantes.
4. Verificar que las 7 funciones estén desplegadas y saludables.

## Procedimiento de rollback
No hay rollback automático de funciones. En caso de fallo:
1. Revertir la función problemática desplegando la versión anterior.
2. Notificar al owner antes de cualquier cambio adicional.

## Qué se necesita del owner
- Autorización explícita para `supabase login` + `functions deploy`.
- Credenciales de Supabase (no solicitar por chat).
- Lista de variables de entorno requeridas por cada función (si faltan).

## Evidencia
- 7 Edge Functions locales revisadas.
- 6 desplegadas remoto; `platform-telemetry` ausente remoto.
- Hashes locales no directamente comparables con remotos.
