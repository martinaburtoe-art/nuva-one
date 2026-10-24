# Owner Console — Implementación (v1, 2026-10-23)

Rama: `feat/owner-console-20261023` (base: `fix/platform-foundations-20261023`). Estado: **implementada localmente, verificación externa pendiente** (ver § Límites).

## Qué existe ahora

### Rutas
| Ruta | Función | Fuentes |
|---|---|---|
| `/owner` | Layout con navegación (redirige a `/owner/console`) | — |
| `/owner/console` | Centro de mando: KPIs del SaaS + operación (tasas de error, latencias p50/95/99, top errores por fingerprint, servicios/vitals) + estados de fuente no disponible | `/api/owner/operational-metrics` (existente, ahora usada al 100%) + `/api/owner/platform-metrics` (NUEVA: conecta por primera vez el RPC huérfano `get_platform_owner_metrics`) |
| `/owner/console/alerts` | Consola de incidentes del motor determinístico: umbrales visibles, incidentes con severidad/ocurrencias/valores, acciones Investigar/Resolver con nota, historial de eventos | `/api/owner/alerts` (NUEVA) |
| `/owner/console/content` | CMS del foro: listado completo (draft/unlisted incluidos), fijar/soltar, publicar/retirar, corrección de título/cuerpo con validación | `/api/owner/forum-admin` (NUEVA) |
| `/owner/control-tower` | Torre Agency — SIN CAMBIOS, ahora accesible desde la misma navegación | existente |

### Base de datos (migración `20261023190000_owner_console_forum_admin_site_content.sql`)
- `forum_topics`: `is_pinned`, `status` (published/draft/unlisted), `updated_by/updated_at`; UPDATE solo para el propietario de plataforma; lectura pública filtrada por `status='published'` (el owner ve todo).
- `owner_admin_actions`: bitácora append-only de acciones administrativas (actor, acción, objetivo, detalles, fecha).
- `site_content` + `site_content_revisions`: base del editor de contenido del sitio (público lee solo lo publicado; owner gestiona; historial de versiones). Sin UI aún — ver § Próximas olas.
- `owner_alert_thresholds` (sembrada con 4 umbrales explícitos y editables) + `owner_incidents` (fingerprint estable, severidad, ocurrencias, ack/resolución) + `owner_incident_events` (historial de transiciones).
- Todo con RLS owner-only vía el MISMO claim existente `app_metadata.platform_role='owner'` (el usado por `platform_expenses`).

### Autorización (ver docs/security/OWNER_CONSOLE_SECURITY.md)
- Helper compartido `assertPlatformOwner` (servidor) — consolida el patrón que estaba replicado en cada API owner.
- Guard `beforeLoad` en cada ruta (sesión + claim); la RLS es el control efectivo en BD.
- Pruebas: pgTAP `116_owner_console_authorization.sql` (16 aserciones de COMPORTAMIENTO simulando owner/usuario normal/anon con claims JWT reales) + vitest de `isPlatformOwner` (5 casos, incluye la no-confusión con member_role).

## Cómo probar manualmente (con cuenta owner)
1. `/owner` → redirige al Centro de mando; con sesión normal → redirect a `/`.
2. KPIs: si la fuente de métricas de plataforma falla, la tarjeta muestra "No disponible · causa" (no ceros falsos).
3. Alertas: abrir con una tasa de error alta (o bajar un umbral en BD) → aparece incidente con valor observado vs umbral; Investigar → estado "Investigando"; Resolver con nota → resuelto + historial.
4. Contenido: fijar un tema → aparece primero en el foro público; Retirar → desaparece del listado público (sigue visible para el owner); Corregir → cambia título/cuerpo y queda auditado en `owner_admin_actions`.
5. Auditoría: `select action, target_type, created_at from owner_admin_actions order by created_at desc limit 10;`

## Límites conocidos (no declarar más de esto)
- **No desplegado**: todo vive en la rama; producción no tiene la migración ni las rutas.
- pgTAP 116 escrito pero **no ejecutado localmente** (Docker apagado); corre en CI con la cadena completa.
- El editor de contenido del sitio (home FAQ/banners) tiene tabla y RLS listas pero **sin UI**: próxima ola.
- Umbrales editables por BD (sin UI de edición todavía).
- La API `/api/owner/platform-metrics` usa el RPC SECURITY DEFINER existente; su salida es agregada (sin datos privados de negocios).
- Vercel/producción y MFA específica del rol owner: pendientes (ver seguridad).

## Próximas olas
1. UI de umbrales + historial de auditoría en la Consola; badge de fijados en el foro público.
2. Editor `site_content` con vista previa + restauración de versiones; conectar `home_faq` con fallback a los valores hardcodeados actuales.
3. Métricas SaaS derivadas (MRR/churn desde `subscription_charges`) con separación de privacidad documentada.
