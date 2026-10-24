# Owner Console — Modelo de seguridad (v1, 2026-10-23)

## Identidad y autorización

- **Rol de plataforma** = claim de servidor `app_metadata.platform_role = 'owner'` (JWT firmado por Supabase; no editable por el cliente). Es DISTINTO del `member_role 'owner'` de un negocio cliente: un dueño de pyme NO obtiene acceso a la Consola por ser owner de su negocio.
- **Tres capas**:
  1. *Ruta (UX)*: `beforeLoad` en cada página — sesión + claim; usuario normal → redirect a `/`, sin sesión → `/auth`.
  2. *API (servidor)*: `assertPlatformOwner(request)` — valida token → `getUser` → claim antes de tocar datos; 401/403 tempranos. Las claves de servicio NUNCA salen al navegador.
  3. *BD (efectiva)*: RLS en cada tabla nueva usando el mismo patrón ya probado de `platform_expenses`: `coalesce(auth.jwt()->'app_metadata'->>'platform_role','') = 'owner'`.
- El control efectivo es la BD: aunque alguien llame a las APIs o a Supabase directamente sin el claim, RLS lo niega. El frontend solo agrega UX y defensa en profundidad.

## Superficie protegida

| Recurso | Público | Usuario normal | Owner de plataforma |
|---|---|---|---|
| `forum_topics` SELECT | solo `status='published'` | solo published | todo (incl. draft/unlisted) |
| `forum_topics` UPDATE | ✗ | ✗ (RLS niega) | ✓ |
| `owner_admin_actions` | ✗ | ✗ (INSERT → error RLS) | lectura+escritura |
| `site_content` SELECT | solo publicado | solo publicado | todo |
| `site_content` escritura | ✗ | ✗ | ✓ (con historial en `site_content_revisions`) |
| `owner_incidents` / umbrales / eventos | ✗ | ✗ (0 filas) | ✓ |
| `/api/owner/platform-metrics` | 401/403 | 403 | agregados del SaaS |
| `/api/owner/forum-admin` / `alerts` | 401/403 | 403 | ✓ con bitácora |

## Privacidad

- Métricas = **agregados** (conteos, tasas, latencias, cobros pagados): sin conversaciones, documentos, identificadores ni datos de negocios individuales.
- Incidentes y auditoría: solo valores técnicos (métrica, umbral, valor observado, notas del propietario). La migración comenta explícitamente la prohibición de secretos/PII en `owner_admin_actions`.
- Telemetría ya existente: `privacy_mode: aggregate_only`, retención 30 días, sin cuerpos de petición/tokens/cookies/IP (política de la API operacional preexistente).

## Pruebas que demuestran el modelo

- **pgTAP `116_owner_console_authorization.sql`** (corre en CI sobre la cadena completa): owner fija/edita; usuario normal NO moderar (UPDATE sin efecto), NO ve drafts, recibe **error RLS 42501** al intentar escribir `site_content`/auditoría, NO ve umbrales ni incidentes; `anon` solo ve published. Escrito — **ejecución en CI pendiente de este push**.
- **vitest `platform-owner.test.ts`**: claim correcto, roles distintos rechazados, no-confusión con member_role, nulos seguros.

## Riesgos residuales y pendientes

1. **MFA específica para el rol owner**: no implementada (pendiente de producto; hoy hereda el 2FA de la cuenta si está activo vía `mfa-required`).
2. **Sin mecanismo público de autoasignación** del rol: correcto por diseño; asignar el claim exige service_role/admin de Supabase.
3. Umbrales editables solo por BD hoy (UI pendiente) — cambio reversible y auditado por git.
4. Orden de despliegue obligatorio: **aplicar la migración antes de hacer deploy del frontend** (el foro público filtra por `status`/`is_pinned`, columnas que no existen antes de migrar).
5. `platform-telemetry`/`platform_events` (código muerto preexistente) y las edge functions duplicadas `owner-metrics`/`owner-operational-metrics`: fuera del alcance de v1; no se conectaron ni eliminaron.
