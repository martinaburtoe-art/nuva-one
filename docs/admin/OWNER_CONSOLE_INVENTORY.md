# Inventario Owner Console — Nüva One

**Fecha:** 2026-10-23 · **Tipo:** investigación de superficie (solo lectura) · **Alcance:** todo lo existente relevante para una "Owner Console" privada (evolución de la Owner Control Tower), con brechas y plan incremental.

Convención de estados: **PASS** = existe y funciona según código; **WARN** = existe con limitaciones/drift/sin uso parcial; **FAIL** = no existe o está muerto en código; **UNKNOWN** = no verificable en el repo.

---

## 1. Tabla de inventario

### A. Rutas /owner y Owner Control Tower

| Elemento | Archivo:línea | Fuente de datos | Estado |
|---|---|---|---|
| Layout `/owner` (redirect a control-tower, `ssr:false`) | `src/routes/owner.tsx:4-19` | — | PASS |
| Ruta principal `/owner/control-tower` con guard `beforeLoad` | `src/routes/owner/control-tower.tsx:33-57` | Supabase Auth (`getUser`) | PASS |
| Guard cliente: `platform_role !== "owner"` → redirect `/` | `src/routes/owner/control-tower.tsx:52-54` | `app_metadata.platform_role` | PASS |
| Panel "Plataforma/Operación" (usuarios, PYMEs, ventas…) | `src/routes/owner/control-tower.tsx:218-243` | `loadMetrics()` → **solo llena `ai_telemetry`** | **WARN** — muestra 0: nada pobla `metrics.platform` |
| `loadMetrics()` → POST `/api/owner/operational-metrics` | `src/routes/owner/control-tower.tsx:59-84` | Server route | PASS (pero descarta `services`, `vitals`, `top_errors`) |
| Panel "Nüva IA" (tokens, costos) | `src/routes/owner/control-tower.tsx:264` | `ai_telemetry` de tipos `:11` | WARN — la fuente actual solo entrega `events_24h`/`fallbacks_24h` (`:80-82`); el resto siempre 0 |
| LiveAgencyPanel (GitHub Actions en vivo, refresco 15 s) | `src/routes/owner/control-tower.tsx:329-413` | GET `/api/owner/agency-status` | PASS |
| DurableAgencyPanel (misiones, leases, aprobaciones) | `src/routes/owner/control-tower.tsx:273-323` | Edge `nuva-agency-worker-control` con **URL hardcodeada** `:100` | WARN |
| Chat AgencyTeam (workers, streaming) | `src/routes/owner/control-tower.tsx:106-122,213,245-260` | POST `/api/owner/agency-chat` | PASS |
| Sub-rutas `/owner/*` adicionales | — (no existen; tampoco `src/routes/_authenticated/owner*`) | — | FAIL — el panel es una sola página monolítica |
| Checklist "Criterios de salida a beta" | `src/routes/owner/control-tower.tsx:265` | Hardcodeado en UI | WARN — no son datos reales |
| Doc de privacidad del console | `docs/OWNER_CONSOLE_PRIVACY.md:1-31` | — | PASS |
| Spec previa Control Tower IA | `docs/OWNER_CONTROL_TOWER_AI_SPEC.md` | — | PASS (referencia) |

### B. Autorización de propietario de la plataforma

| Elemento | Archivo:línea | Fuente de datos | Estado |
|---|---|---|---|
| Definición del rol: `app_metadata.platform_role = 'owner'` | migraciones no la crean; se asigna vía Auth admin | `auth.users.raw_app_meta_data` | WARN — sin gobernanza en código (ver §3) |
| Guard cliente en la página | `src/routes/owner/control-tower.tsx:52` | `supabase.auth.getUser()` | PASS |
| Server route `/api/owner/operational-metrics` valida owner | `src/routes/api/owner/operational-metrics.ts:23-29` | `getUser(token)` + `app_metadata` | PASS |
| Server route `/api/owner/agency-status` valida owner | `src/routes/api/owner/agency-status.ts:63-80` | ídem | PASS |
| Server route `/api/owner/agency-control` valida owner | `src/routes/api/owner/agency-control.ts:17-24` | ídem | PASS |
| Server route `/api/owner/agency-chat` valida owner | `src/routes/api/owner/agency-chat.ts:47-52` | ídem | PASS |
| Edge `owner-metrics` valida owner | `supabase/functions/owner-metrics/index.ts:12-13` | `auth.admin.getUserById` | PASS (pero huérfana, ver C) |
| Edge `owner-operational-metrics` valida owner | `supabase/functions/owner-operational-metrics/index.ts:35-37` | `getUser(token)` | PASS (huérfana) |
| Edge `owner-create-complimentary-account` valida owner | `supabase/functions/owner-create-complimentary-account/index.ts:13-14` | ídem | PASS |
| Edge `nuva-agency-worker-control`: owner **o** worker GitHub OIDC | `supabase/functions/nuva-agency-worker-control/index.ts:32-45` | `getUser` / `jwtVerify` JWKS de GitHub | PASS |
| RPC `get_platform_owner_metrics(p_owner_id uuid)` v2: valida contra `auth.users.raw_app_meta_data` | `supabase/migrations/20260818090000_owner_platform_economy.sql:36-51` (reemplaza v1 de `20260817200100:1-35`, drop en `:34`) | `auth.users` | PASS |
| Grants RPC v2: solo `service_role` | `supabase/migrations/20260818090000_owner_platform_economy.sql:73-74` | — | PASS |
| RLS `platform_expenses` owner-only (select/insert/update/delete) | `supabase/migrations/20260818090000_owner_platform_economy.sql:17-32` | `auth.jwt()->'app_metadata'->>'platform_role'` | PASS |
| Tabla/bitrácora de admins de plataforma | — | — | FAIL — no existe |
| Exigencia de MFA para owner | — (existe `src/routes/_authenticated/mfa-required.tsx` genérico) | — | UNKNOWN |

### C. APIs de métricas del dueño

| Elemento | Archivo:línea | Fuente de datos | Estado |
|---|---|---|---|
| RPC `get_platform_owner_metrics(uuid)` — usuarios, negocios, ventas, income (`subscription_charges` paid), expenses (`platform_expenses`) | `supabase/migrations/20260818090000_owner_platform_economy.sql:36-74` | counts de tablas de negocio + facturación | **WARN — SIN LLAMADORES**: solo aparece en `src/integrations/supabase/types.ts:11190`; ningún endpoint la invoca ⇒ el panel "Plataforma" del Control Tower muestra 0 |
| Server route `/api/owner/operational-metrics` (usada por el Tower) | `src/routes/api/owner/operational-metrics.ts:6-82` | RPC `get_owner_operational_metrics` (`:39-42`); purga 30 d en cada lectura (`:34-37`) | PASS |
| Edge `owner-metrics` | `supabase/functions/owner-metrics/index.ts:7-45` | RPC `get_owner_operational_metrics` (`:15`) | WARN — huérfana (sin invocador en `src/`) |
| Edge `owner-operational-metrics` | `supabase/functions/owner-operational-metrics/index.ts:27-83` | RPC ídem (`:46-49`); purga 30 d (`:41-44`) | WARN — huérfana; duplica la server route con schema de respuesta más rico (`error_rate_5m/1h`, latencias p50/95/99, `:65-69`) |
| Tabla `owner_operational_events` (esquema v1) | `supabase/migrations/20260921000000_owner_operational_telemetry.sql:1-13` | — | PASS |
| Endurecimiento tabla (checks de rango, políticas deny anon/authenticated) | `supabase/migrations/20260922090000_harden_owner_operational_telemetry.sql:5-27` | — | PASS |
| RLS tabla: revoke anon/authenticated, grant `service_role` | `20260921000000:19-21` y `20260922090000:21-22` | — | PASS |
| Comentario de privacidad (sin PII, sin cuerpos, sin IPs) | `20260921000000:23`; reforzado `20260922090000:1-3` | — | PASS |
| RPC `get_owner_operational_metrics(window_hours)` — eventos, errores, distinct errors, vitals, services, top_errors, error_rate 5m/1h, latencias p50/95/99 | `supabase/migrations/20260922090000:36-155` (rollup previo en `20260921000001:1-59`) | `owner_operational_events` | PASS — concedida solo a `service_role` (`:154-155`) |
| RPC `purge_owner_operational_telemetry(retention_days)` | `20260921000000:82-98` | — | WARN — nunca se llama como cron; la purga se hace ad-hoc en cada lectura |
| Quién escribe en la tabla: server route `/api/telemetry` (rate-limit 30/min/origen, allowlist de fingerprints, validación de vitales) | `src/routes/api/telemetry.ts:48-115` (rate limit `:57-66`, fingerprints `:35-46`, insert `:96-106`) | insert con `service_role` | PASS |
| Drift `health_probe`: permitido en CHECK v1 (`20260921000000:3`) pero ausente en la re-declaración v2 (`20260922090000:7`) y sin escritor | `20260921000000:3` vs `20260922090000:7` | — | WARN |

### D. Telemetría

| Elemento | Archivo:línea | Fuente de datos | Estado |
|---|---|---|---|
| Captura cliente: errores window/unhandledrejection + vitals LCP/CLS/INP/FCP/TTFB con flush en `pagehide` | `src/lib/lovable-error-reporting.ts:14-69` | POST `/api/telemetry` | PASS — fuente real de `owner_operational_events` |
| Helper de envío y fingerprints de error | `src/lib/owner-telemetry.ts:9-35` | POST `/api/telemetry` | PASS |
| Instalación en `__root.tsx` (import + `reportLovableError` en ErrorComponent) | `src/routes/__root.tsx:18,62` | — | PASS |
| Edge `platform-telemetry` (evento→`platform_events`, resuelve `business_id` server-side, nunca persiste user_id) | `supabase/functions/platform-telemetry/index.ts:20-112` (tenant check `:69-82`, sin PII `:84-96`) | `platform_events` | **FAIL — SIN LLAMADORES**: `trackPlatformEvent`/`trackPageView`/`captureBrowserPerformance` (`src/lib/platform-telemetry.ts:14-58`) no se importan en ningún archivo |
| Tabla `platform_events` + RPC `platform_metrics` (service_role-only) | `supabase/migrations/20260817200000_platform_observability.sql:3-44` | — | WARN — tabla sin escritor activo |
| Índices normalizados de `platform_events` | `supabase/migrations/20260827050000_normalize_platform_event_index.sql:1-20` | — | PASS |
| `system_alerts` (alertas de infra, service_role-only) | `supabase/migrations/20260803193000_system_alerts.sql:10-25`; grants duros `20260819031500:1-3` | — | PASS — pero sin UI en el Tower |
| `ops_incidents` (Vigía de producción, fingerprints, triage, `notified_at`) | `supabase/migrations/20260920120000_ops_incidents.sql:3-38` | GitHub Actions (Vigía) | WARN — sin UI en el Tower |
| `/api/health` (liveness simple, sin escribir telemetría) | `src/routes/api/health.ts:3-18` | — | PASS |
| Qué falta: `api_error` desde servidor no se instrumenta (solo el cliente puede enviar `api_error`); no hay alertas activas (email/Telegram/push) desde el panel; `notified_at` existe pero no hay flujo de notificación visible en el repo | — | — | FAIL |

### E. Foro (futuro CMS)

| Elemento | Archivo:línea | Fuente de datos | Estado |
|---|---|---|---|
| `forum_topics` (business_id, business_name/industry denorm, author_user_id, title 5-150, body 10-5000, category CHECK 7 valores, reply_count) | `supabase/migrations/20260811160000_public_forum_and_directory.sql:42-58` | — | PASS |
| RLS topics: SELECT público (`:67-70`), INSERT miembros (`:73-79`), DELETE solo miembros del mismo negocio (`:82-85`) | ídem | `private.is_business_member` | PASS |
| `forum_replies` (topic_id, business_id, body 2-3000) + RLS análogas | ídem `:88-121` | — | PASS |
| Trigger `forum_sync_reply_count` | ídem `:126-147` | — | PASS |
| `views` + RPC `increment_forum_topic_views` | `supabase/migrations/20260829170000_reconcile_ci_schema_drift.sql:4-19` | — | PASS |
| Sin UPDATE deliberado ("borrar y re-publicar si hay que corregir") | `20260811160000:15-16` (comentario de diseño) | — | PASS por diseño, pero **bloquea el CMS** |
| UI: crear tema/respuesta y borrar propios | `src/routes/foro/index.tsx` (crear) y `src/routes/foro/$topicId.tsx:103-117,163,188` (delete) | — | PASS |
| Operaciones admin inexistentes: editar, destacar/fijar, borrador, publicar/despublicar (hoy publicación instantánea), historial de ediciones, moderación por el owner de la PLATAFORMA (no hay policy `platform_role` sobre el foro), categorías gestionables (CHECK fijo), reportes de abuso | — | — | FAIL (todo el bloque) |

### F. Contenido del sitio

| Elemento | Archivo:línea | Fuente de datos | Estado |
|---|---|---|---|
| FAQ del landing hardcodeado | `src/routes/index.tsx:13-19` (`FAQ_ITEMS`), `:21-28` (STRUCTURED_DATA) | constantes | FAIL — sin mecanismo de contenido configurable |
| Noticias hardcodeadas (7 items con fecha fija) | `src/routes/noticias.tsx:17-25` (`NEWS`), fuentes `:26-32` | constantes | FAIL |
| Precios: constantes frontend `NUVA_PLANS` | `src/lib/plan-config.ts:3-78`, usadas en `src/routes/pricing.tsx:17,38+` | — | WARN — duplica la DB `plan_catalog` (`20260821100000:1-20`); editar precios exige código pese a que la tabla existe |
| Búsqueda de mecanismos CMS (site_content, banners, FAQ, landing_content) | 0 resultados en `supabase/migrations/` | — | FAIL — todo el contenido público está hardcodeado |
| Excepción parcial: directorio público de negocios (vista `businesses_public` con `public_enabled`) | `supabase/migrations/20260811160000:19-39` | DB | PASS — es el único contenido público dinamizado |

### G. Suscripciones/facturación (base de métricas SaaS)

| Elemento | Archivo:línea | Fuente de datos | Estado |
|---|---|---|---|
| `businesses.plan` ('starter','pro') | `supabase/migrations/20260709210000_billing_plan_enforcement.sql:7` | — | PASS |
| Columnas Flow: `flow_customer_id`, `flow_card_status`, `next_charge_date`, `billing_failed_attempts` | `supabase/migrations/20260809120000_flow_subscriptions.sql:7-12` | — | PASS |
| Columnas MercadoPago: `billing_provider`, `mercadopago_preapproval_id`, `mercadopago_customer_id` | `supabase/migrations/20260825210000_add_mercadopago_billing.sql:1-4` | — | PASS |
| Tabla `subscription_charges` (cobros del plan al negocio: commerce_order UNIQUE, amount, status paid/rejected, flow_order) | `20260809120000:21-29`; +provider/provider_payment_id/subscription_id `20260825210000:6-9`; +`attempt_started_at` `20260829170000:21-25` | — | PASS |
| `plan_catalog` + vista `business_plan_limits` + `ai_usage_monthly` + trigger `enforce_product_plan_limit` | `supabase/migrations/20260821100000_define_saas_plan_economics_v1.sql:1-63` | — | PASS |
| `platform_expenses` (gastos de la plataforma, CRUD owner-only vía RLS) | `20260818090000:5-32` | — | PASS — sin UI: solo accesible con un cliente SQL |
| `payment_intents` (cobros de los negocios a SUS clientes — no es billing del SaaS) | `20260807130000_payment_intents.sql` | — | PASS |
| APIs de billing (Flow register/callback/cancel/run-charges; payments create/connect/disconnect/webhook; mercadopago create/manage/webhook) | `src/routes/api/billing/**` | — | PASS |
| Métricas SaaS derivadas (MRR, churn, cohortes, conversión trial→pro, uso IA vs cuota) | — (solo `income`/`expenses` en `get_platform_owner_metrics`, `20260818090000:64-65`) | — | FAIL |

### H. Nüva Agency — conectores verificables en código

| Elemento | Archivo:línea | Fuente de datos | Estado |
|---|---|---|---|
| GitHub: estado de 8 workflows + jobs + steps | `src/routes/api/owner/agency-status.ts:6-16,49-61,100-127` | GitHub API con `GITHUB_TOKEN` | PASS |
| GitHub: autenticación de workers (el run debe pertenecer al repo) | `src/routes/api/owner/agency-control.ts:26-34` | verificación de run vía API | PASS |
| GitHub OIDC: `jwtVerify` contra JWKS de `token.actions.githubusercontent.com` con claims repository/run_id/agent | `supabase/functions/nuva-agency-worker-control/index.ts:23-30` | — | PASS |
| Supabase (control plane durable): `agency_missions/tasks/events/agent_leases/approvals/artifacts` + RPC `agency_claim_task/agency_heartbeat/agency_finish_task` | `supabase/migrations/20261007000000_durable_autonomous_agency_control_plane.sql:4-140` (seed misión `:142-168`) | service_role-only | PASS |
| Acciones owner sobre el control plane: `create_mission`, `mission_status`, `delegate`… | `src/routes/api/owner/agency-control.ts:125-140` | — | PASS |
| Evidencia de auditoría `ops_agent_audit_runs` | `supabase/migrations/20261006190000_nuva_agency_audit_runs.sql:1-23`; consumida en `agency-status.ts:143-153` | — | PASS |
| IA: chat con workers vía `getChatModel` + `streamText` | `src/routes/api/owner/agency-chat.ts:2-4,54-70` | AI gateway (`src/lib/ai-gateway.server.ts`) | PASS |
| Edge `nuva-agency-ai-broker`, `nuva-telegram-agency` | `supabase/functions/nuva-agency-ai-broker/index.ts`, `nuva-telegram-agency/index.ts` | — | UNKNOWN (presentes, no auditados en este pase) |
| Vercel: sin conector verificable — solo referencias textuales ("Vercel" en capacidades del worker `release`, `agency-chat.ts:69`; `VERCEL_GIT_COMMIT_SHA` en `api/health.ts:10`) | — | — | UNKNOWN/FAIL — no hay API de Vercel en código |
| Aprobaciones Agency: tabla existe con `status/decided_by` pero no hay endpoint owner para aprobar/rechazar | `20261007000000:39-46`; UI solo las cuenta (`control-tower.tsx:277,318`) | — | WARN |

---

## 2. Brechas por apartado del panel

**A. Centro de mando** — El Tower existe pero la mitad de sus tarjetas muestra 0: `loadMetrics()` (`control-tower.tsx:59-84`) nunca pobla `metrics.platform` y la RPC `get_platform_owner_metrics` no tiene llamadores. Falta: navegación con sub-secciones (hoy 1 sola página), commanders reales (aprobar `agency_approvals`, decidir misiones), y elim inar la URL de Supabase hardcodeada (`:100`) usando `/api/owner/agency-control` que ya existe.

**B. Monitorización/alertas** — Los datos ya viajan en la respuesta de `/api/owner/operational-metrics` (`operational-metrics.ts:48-66`: `error_rate_5m/1h`, latencias p50/95/99, `vitals`, `top_errors`, `services`) pero el Tower solo muestra 2 números (`:79-83`). Faltan: UI para top_errors/vitals/servicios; lectura de `ops_incidents` y `system_alerts` (hoy sin endpoint owner); alertas activas (no hay notificaciones aunque `ops_incidents.notified_at` existe); cron de purga de telemetría (hoy se purga en cada lectura, `operational-metrics.ts:34-37`); instrumentación `api_error` del lado servidor.

**C. CMS del foro** — El foro es público e instantáneo por diseño (`20260811160000:11-16`): sin edición, sin borradores, sin destacar, sin publicar/despublicar, sin historial, sin moderación del owner de plataforma (las policies solo reconocen `is_business_member`; no existe ninguna policy `platform_role='owner'` sobre el foro). Categorías fijas por CHECK (`:55`).

**D. Editor de contenido del sitio** — No existe ningún mecanismo: FAQ (`index.tsx:13-19`), noticias (`noticias.tsx:17-25`), metadatos SEO y textos del landing son constantes. Precios ya tienen tabla en DB (`plan_catalog`) pero la página pública lee constantes duplicadas (`plan-config.ts:3-78`). Cualquier cambio de copy exige deploy.

**E. Métricas SaaS** — Solo existe un agregado bruto `income`/`expenses` en `get_platform_owner_metrics` (`20260818090000:64-65`) sin UI. Faltan MRR mensual, churn (señales en `flow_card_status`/`billing_failed_attempts`), cohortes de alta, conversión trial→pro, uso IA vs cuota (`ai_usage_monthly`), ARPU. Los datos base ya están en `subscription_charges`, `businesses` y `ai_usage_monthly`.

---

## 3. Modelo de autorización actual y debilidades

**Modelo:** el owner de la plataforma es cualquier usuario de Supabase Auth cuyo `app_metadata.platform_role === 'owner'`. El owner de un NEGOCIO (rol `owner` en `business_members`) es un concepto distinto e independiente. El check se replica en 8+ puntos: cliente (`control-tower.tsx:52`), 4 server routes (`api/owner/*`), 4 edge functions, 1 RPC (`20260818090000:45-51`) y RLS de `platform_expenses` (`20260818090000:22-30`).

**Debilidades:**
1. **Gobernanza del rol fuera de código**: ninguna migración crea ni audita `platform_role`; se asigna a mano con el dashboard/admin API. No hay tabla `platform_admins`, ni bitácora de concesión/revocación.
2. **Sin MFA específica para owner**: el acceso al panel no exige segundo factor (hay flujo MFA genérico en `_authenticated/mfa-required.tsx`, sin conexión a `platform_role`).
3. **Check duplicado con drift**: 3 implementaciones paralelas de "owner metrics" (server route + 2 edge functions) ya difieren en respuesta (una expone `error_rate/latencias`, otra no) — riesgo de comportamiento inconsistente y superficie de ataque triple.
4. **La guard de página es client-side**: `/owner/control-tower` se sirve a cualquiera (los datos sí están protegidos); revela la existencia y layout del panel.
5. **JWT de owner = llave maestra sin revocación granular**: no hay invalidación de sesión específica para el rol ni detección de anomalías; un token robado con `platform_role=owner` accede a todo hasta expirar.
6. **Privilegio sin bitácora**: `owner-create-complimentary-account` crea cuentas Pro activas sin cobro (`index.ts:33-50`) dejando solo `provisioned_by` en `app_metadata` — no hay registro auditable de cuentas cortesía.
7. **Nomenclatura ambigua** `owner` (negocio) vs `owner` (plataforma) en el mismo codebase facilita errores futuros de policy; no hay helper compartido: cada endpoint reimplementa el check.

---

## 4. Plan de implementación incremental (3 olas)

### Ola 1 — Fundación y reparación (sin nuevas features de datos)
1. **Unificar autorización**: crear `src/lib/owner-auth.server.ts` con `requirePlatformOwner(request)`; reemplazar los checks en `src/routes/api/owner/operational-metrics.ts:23-29`, `agency-status.ts:63-80`, `agency-control.ts:17-24`, `agency-chat.ts:47-52`. Decidir un único canal para métricas owner (recomendado: server route `/api/owner/operational-metrics`) y deprecar `supabase/functions/owner-metrics` y `owner-operational-metrics` (hoy huérfanas).
2. **Gobernanza del rol**: migración `platform_admins` (user_id, granted_by, granted_at) + trigger que deniegue `platform_role='owner'` sin fila correspondiente + tabla `platform_audit_log` para acciones del console. Incluir exigencia de MFA para el rol en `beforeLoad` (usar `auth.mfa.getAuthenticatorStatus`).
3. **Reparar el centro de mando**: invocar la RPC existente `get_platform_owner_metrics(uuid)` desde `/api/owner/operational-metrics` (o nueva `/api/owner/platform-metrics`) y poblar `metrics.platform` en `control-tower.tsx:59-84` para que las tarjetas `:218-243` dejen de mostrar 0.
4. **Higiene**: sustituir la URL hardcodeada de `control-tower.tsx:100` por la server route equivalente `/api/owner/agency-control`; mover la purga de 30 días de `operational-metrics.ts:34-37` a un cron (GitHub Actions semanal → `purge_owner_operational_telemetry(30)`); resolver el drift `health_probe` (`20260921000000:3` vs `20260922090000:7`).
5. **Estructura de rutas**: crear layout con navegación (`/owner/control-tower`, `/owner/monitor`, `/owner/forum`, `/owner/site`, `/owner/saas`) — la base para las olas 2-3.

### Ola 2 — Monitorización + métricas SaaS + moderación básica
1. **Monitor**: sub-página `/owner/monitor` que muestre lo que ya devuelve la API (`top_errors`, `vitals`, `services`, `error_rate_5m/1h`, latencias — `operational-metrics.ts:48-66`); server routes owner-only para `ops_incidents` (20260920120000) y `system_alerts` (20260803193000) con acciones resolver/silenciar; alertas activas vía el canal Telegram ya existente (`nuva-telegram-agency`) o email usando `ops_incidents.notified_at`.
2. **Telemetría de producto**: decidir y ejecutar — o conectar `trackPageView`/`captureBrowserPerformance` (hoy sin llamadores, `src/lib/platform-telemetry.ts:18-58`) para activar `platform_events`, o eliminar ese camino muerto y extender `owner_operational_events`. Instrumentar `api_error` del servidor en los handlers críticos.
3. **Métricas SaaS**: migración con RPC `get_saas_owner_metrics` (MRR 30 d desde `subscription_charges` status='paid'; negocios por `plan`; churn proxy desde `flow_card_status='failed'`/`billing_failed_attempts`; conversión trial→pro; uso IA desde `ai_usage_monthly` vs límite de `plan_catalog`; cohortes por `businesses.created_at`) + server route `/api/owner/saas-metrics` + panel `/owner/saas`.
4. **CMS foro fase 1**: migración que agrega `status` ('published'/'hidden'), `pinned boolean`, `edited_at` a `forum_topics` + policies owner de plataforma (patrón RLS ya probado en `platform_expenses`: `auth.jwt()->'app_metadata'->>'platform_role'='owner'`) para update/delete de cualquier tema/respuesta + UI mínima de moderación en `/owner/forum` (listar, ocultar/mostrar, fijar, borrar).

### Ola 3 — CMS completo + editor de sitio + cierre de Agency
1. **CMS foro fase 2**: borradores (`status='draft'`), edición con historial (tabla `forum_revisions`), categorías gestionables (tabla `forum_categories` reemplazando el CHECK `20260811160000:55`), cola de reportes de abuso; toda acción moderadora escrita en `platform_audit_log`.
2. **Editor de contenido del sitio**: migración `site_content` (key, value jsonb, published, updated_by, updated_at, RLS owner) + server routes CRUD `/api/owner/site-content` + refactor de `src/routes/index.tsx` (FAQ `:13-19`, structured data `:21-28`), `src/routes/noticias.tsx` (`NEWS :17-25`) y textos del landing para leer de la DB con fallback a los defaults actuales (SSR permite caché).
3. **Editor de planes**: UI `/owner/plans` sobre `plan_catalog` existente (20260821100000) para editar precios/límites sin deploy; alinear `src/lib/plan-config.ts` para hidratar desde la DB y eliminar la duplicación con `pricing.tsx`.
4. **Agency**: endpoint owner-only para decidir `agency_approvals` (aprobar/rechazar; la tabla ya tiene `decided_by/decision_note`, `20261007000000:44-46`); mostrar `agency_artifacts`; conectar cuentas cortesía con bitácora (`owner-create-complimentary-account` → `platform_audit_log`).
5. **Verificación de conectores**: documentar como UNKNOWN el conector Vercel hasta que exista código real (hoy solo `VERCEL_GIT_COMMIT_SHA` en `api/health.ts:10`); auditar `nuva-agency-ai-broker` y `nuva-telegram-agency` antes de reutilizarlos para alertas.

**Archivos objetivo por ola (resumen):**
- Ola 1: `src/lib/owner-auth.server.ts` (nuevo), `src/routes/api/owner/*.ts`, `supabase/migrations/*_platform_admins.sql` (nuevo), `src/routes/owner/control-tower.tsx`, `src/routes/owner.tsx`.
- Ola 2: `src/routes/owner/monitor.tsx` (nuevo), `src/routes/owner/saas.tsx` (nuevo), `src/routes/api/owner/{incidents,alerts,saas-metrics}.ts` (nuevos), `supabase/migrations/*_forum_moderation.sql` (nuevo), `src/lib/platform-telemetry.ts`.
- Ola 3: `supabase/migrations/*_{site_content,forum_revisions,forum_categories}.sql` (nuevos), `src/routes/api/owner/site-content.ts` (nuevo), `src/routes/{index,noticias,pricing}.tsx`, `src/lib/plan-config.ts`, `src/routes/owner/{forum,site,plans}.tsx` (nuevos), `src/routes/api/owner/agency-approvals.ts` (nuevo).
