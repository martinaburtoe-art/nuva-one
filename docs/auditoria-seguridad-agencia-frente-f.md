# Auditoría de seguridad y gobernanza — Nüva Agency (Frente F)

**Repositorio:** `C:/Users/marti/Documents/nuva-one`
**Fecha:** 2026-11-04 (Hora verano Sudamérica Pacífico, UTC-03)
**Autor:** Hermes Agent (subagente delegado)
**Estado:** Entregable final — revisión de seguridad, sin valores de secretos revelados

---

## 1. Alcance y archivos revisados

| Área | Archivo / ruta | Qué cubre |
|------|---------------|-----------|
| Autenticación de workers (OIDC) | `src/lib/agency/worker-auth.ts` | Validación de runs de GitHub para workers de agencia |
| Control de agencia (Next.js) | `src/routes/api/owner/agency-control.ts` | Endpoint `/api/owner/agency-control` (owner + worker) |
| Control de agencia (Edge Function) | `supabase/functions/nuva-agency-worker-control/index.ts` | Edge function equivalente con verificación JWT OIDC |
| Reclamos de worker OIDC | `supabase/functions/nuva-agency-worker-control/worker-claims.ts` | Claims, audiencia, agente permitidos, flujo de trabajo |
| Broker de IA con OIDC | `supabase/functions/nuva-agency-ai-broker/index.ts` | Proxy de proveedores de IA con token de GitHub OIDC |
| Auditoría de salud | `supabase/functions/nuva-telegram-agency/audit.ts` | Evidencias de auditoría persistidas en `ops_agent_audit_runs` |
| Autorización owner | `src/lib/agency/owner-auth.server.ts` | `platform_role === "owner"` sobre `app_metadata` |
| Ejecución owner | `src/routes/api/owner/agency-execute.ts` | Ejecución de `scripts/agency-task-executor.mjs` |
| Estado y logs de agencia | `src/routes/api/owner/agency-status.ts`, `agency-logs.ts` | Lectura de control plane y evidencia |
| Métricas operativas | `src/routes/api/owner/operational-metrics.ts` | Métricas agregadas (owner) |
| Chat de agencia | `src/routes/api/owner/agency-chat.ts` | Asistente owner con memoria (service_role) |
| Acción aprobada | `src/routes/api/nuva-action-execute.ts` | Ejecución de acciones de `nuva_action_queue` solo si `approved` |
| Variables de entorno (ejemplo) | `.env.example` | Placeholders únicamente, sin valores reales |
| Variables reales (LOCAL, no commiteado) | `.env.local` | **No se leyó ni se expone**; está en `.gitignore` |
| Entorno de servidor | `src/lib/supabase-env.server.ts` | Carga de `SUPABASE_SERVICE_ROLE_KEY` (sin prefijo VITE) |
| Migración control plane | `supabase/migrations/20261007000000_durable_autonomous_agency_control_plane.sql` | Tablas `agency_*`, RLS, RPC `security definer`, permisos |
| Migración de sensibilidad People | `supabase/migrations/20261025150000_people_rls_select_hardening.sql` | Políticas owner/admin sobre nómina, contratos, documentos |
| RFC de seguridad | `docs/SECURITY.md` | Modelo de autorización y reglas de base de datos |
| Flujo de worker | `.github/workflows/nuva-agency-durable-worker.yml` | Programación cada 5 min + `workflow_dispatch`, `github.token` |

**No se leyó `.env.local` ni ningún archivo con valores reales de secretos. Toda mención de credenciales en este informe usa `[REDACTED]` o solo el nombre de la variable.**

---

## 2. Estado de permisos y autenticación

### 2.1 Dueño (owner)
- Las rutas `/api/owner/*` usan `authorizeAgencyOwner()`: valida la sesión de Supabase con `anonKey` + bearer token y exige `data.user.app_metadata.platform_role === "owner"`.
- `platform_role` vive en `app_metadata`, por lo que solo puede asignarse con privilegios de servicio (dashboard de Supabase o `service_role`), no desde el cliente. Buena práctica.
- Las rutas revisadas que aplican este control: `agency-control`, `agency-execute`, `agency-status`, `agency-logs`, `agency-chat`, `operational-metrics`.

### 2.2 Trabajadores de agencia (workers / OIDC)
Hay **dos puntos de aplicación** para lo mismo concepto y no son idénticos:

| Punto | Archivo | Mecanismo | Repositorio | Flujo permitido | Eventos | Actores | Agentes permitidos |
|-------|---------|-----------|-------------|-----------------|---------|---------|--------------------|
| Next.js route | `src/lib/agency/worker-auth.ts` | GitHub REST API con bearer token del llamante | `martinaburtoe-art/nuva-one` | `schedule`, `workflow_dispatch` | solo esos dos | `martinaburtoe-art` | 22 agentes (incluye `product`, `customer_success`, `support`, `marketing`, `seo`, `analytics`, `accounting`, `tax_chile`, `integrations`, `data_bi`) |
| Edge Function | `.../worker-claims.ts` | JWT OIDC verificado contra JWKS de `token.actions.githubusercontent.com` | `martinaburtoe-art/nuva-one` | `schedule`, `workflow_dispatch`, `push` | incluye `push` | `martinaburtoe-art` | 13 agentes (sin los 9 adicionales de arriba) |

Observaciones:
- El edge function hace verificación criptográfica real del token OIDC (JWT + JWKS + audiencia `nuva-one-agencia` + `workflow_ref` exacto). Es el mecanismo más fuerte.
- `worker-auth.ts` valida llamando a la API de GitHub con un token que entrega el llamante: un token personal válido con acceso al repositorio podría suplantar la identidad. Es menos robusto que JWT.
- **Inconsistencia crítica:** las listas de agentes difieren (22 vs 13), los eventos difieren (`push` solo en el edge function), y los mecanismos difieren (REST vs JWT). Un worker aceptado por una vía puede ser rechazado por la otra.

### 2.3 Acceso a base de datos desde el control plane
Tanto las rutas Next.js como el edge function usan cliente de Supabase con `serviceRoleKey` (`SUPABASE_SERVICE_ROLE_KEY`). El rol de servicio **bypasa RLS** por diseño. Todas las operaciones de `agency_*` (misiones, tareas, eventos, arrendamientos, aprobaciones, artefactos) se ejecutan como `service_role`.

- `SUPABASE_SERVICE_ROLE_KEY` se lee solo de `process.env` (sin prefijo `VITE_`), por lo que **no llega al bundle del cliente**. Correcto.
- `getServerSupabaseEnv().ok` no exige `serviceRoleKey`; algunas rutas degradan a 503 si falta, otras lo usan cuando existe.

---

## 3. Estado de RLS y aislamiento de datos

### 3.1 Tablas de agencia (`public.agency_*`)
Migración `20261007000000_durable_autonomous_agency_control_plane.sql`:
- `RLS ENABLED` en las 6 tablas (`agency_missions`, `agency_tasks`, `agency_events`, `agency_agent_leases`, `agency_approvals`, `agency_artifacts`).
- `REVOKE ALL` de `anon` y `authenticated` en todas ellas.
- **No existen políticas RLS** sobre estas tablas (el archivo lo declara como "defense in depth").
- Los RPC `agency_claim_task`, `agency_heartbeat`, `agency_finish_task` son `SECURITY DEFINER` con `search_path` explícito y `EXECUTE` concedido solo a `service_role`.

Conclusión de aislamiento:
- Los usuarios `anon`/`authenticated` no tienen privilegios sobre las tablas de agencia: aislamiento efectivo desde el cliente web.
- Como todo el acceso de servidor usa `service_role` (que bypassa RLS), RLS no se ejerce realmente en el control plane; depende exclusivamente de la autenticación de aplicación (owner / worker OIDC) y de la confidencialidad de `SUPABASE_SERVICE_ROLE_KEY`.
- Riesgo: si `SUPABASE_SERVICE_ROLE_KEY` se filtra, hay bypass total de RLS sobre datos de agencia y cualquier otra tabla del proyecto.

### 3.2 Tablas sensibles de People (nómina, contratos, documentos)
Migración `20261025150000_people_rls_select_hardening.sql`:
- Tablas `people_employees`, `people_contracts`, `people_documents`, `people_payroll_items`, `people_payroll_periods`, `people_payroll_postings`, `people_payroll_runs`, `people_payroll_liquidations`, `people_payroll_inputs`, `people_vacation_balances`, `people_terminations`, `people_absences`, `people_lre_rows`.
- Políticas `*_select_owner_admin`: lectura restringida a owner/admin.
- RPC `people_employees_limited(uuid)`: acceso operativo con campos limitados (sin remuneraciones, contratos completos, documentos ni liquidaciones). Concedido a `authenticated`.
- Esta es la separación correcta: el personal operativo ve directorio limitado; owner/admin ve datos sensibles.

### 3.3 Auditoría
- `audit_log`: lectura solo para admins (migración `20260714010000`); políticas de inserción para miembros.
- `agency_events`: bitácora de acciones de workers (claim, finish, delegate, approval.decided, mission.created) con `agent_id`, `event_type`, `level`, `payload`.
- `ops_agent_audit_runs`: persistencia de auditorías de salud (PASS/WARN/FAIL).

---

## 4. Exposición de endpoints

| Endpoint | Método | Autenticación | Observación de exposición |
|----------|--------|---------------|---------------------------|
| `/api/owner/agency-control` | GET/POST | owner (GET), owner o worker OIDC (POST) | Acceso completo al control plane de agencia |
| `/api/owner/agency-execute` | POST | owner | `execFile` de `scripts/agency-task-executor.mjs --task=T-####`. Ejecución de script del servidor con ID de tarea validado por regex. Potente; solo owner. |
| `/api/owner/agency-status` | GET/POST | owner | Lectura de control plane + runs de GitHub + evidencias de auditoría |
| `/api/owner/agency-logs` | GET | owner | Logs de tareas y ciclos de agencia |
| `/api/owner/agency-chat` | POST | owner | Chat con modelo de IA; memoria leída/escrita con `service_role` |
| `/api/owner/operational-metrics` | POST | owner | Métricas agregadas, modo agregado, sin PII ni tokens |
| `/api/nuva-action-execute` | POST | authenticated (owner/admin del negocio) | Ejecuta acciones de `nuva_action_queue` solo si `status = 'approved'`; rechaza `mode = 'review'` |
| Edge function `nuva-agency-worker-control` | POST | OIDC worker o owner | Respuesta con `access-control-allow-origin: "*"` (CORS abierto a cualquier origen) |
| Edge function `nuva-agency-ai-broker` | POST | OIDC GitHub | Proxy de proveedores de IA; limita workflows permitidos y tamaño de payload |

Hallazgos de exposición:
- **CORS abierto** (`Access-Control-Allow-Origin: *`) en el edge function de control de agencia. Aunque exige autenticación, amplía innecesariamente la superficie de exposición.
- `agency-execute` ejecuta un script del servidor a petición del owner sin gate de aprobación adicional ni registro de quién ordenó cada ejecución más allá de la sesión owner.
- El edge function expone como audiencia hardcodeada `https://vnzyecnbdqbfuxawzrda.supabase.co` (identificador del proyecto, no secreto).

---

## 5. Secretos y credenciales

**Política aplicada:** no se leyó ni se expone ningún valor real. `[REDACTED]` en todo este informe.

Hallazgos (sin valores):
- `.env.local` existe en el disco de desarrollo con valores reales, pero está en `.gitignore` junto con `.env` y `.env.*.local`. No está versionado. Riesgo de commit accidental si `.gitignore` se modifica.
- `.env.example` contiene solo placeholders (`tu-proyecto-id`, `tu-anon-key-publica`, claves vacías). Seguro para versión.
- No se encontraron claves secretas hardcodeadas en `src` (solo un token de prueba `"test-github-token-not-a-secret"` en un test).
- Las variables esperadas en el entorno de despliegue (no en el repositorio): `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `GROQ_API_KEY`, `LOVABLE_API_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `META_APP_SECRET`, `NUVA_WHATSAPP_ACCESS_TOKEN`, `N8N_WEBHOOK_SECRET`, `N8N_WEBHOOK_URL`, `CRON_SECRET`, `VERCEL_TOKEN`, `CLOUDFLARE_API_TOKEN`, `GEMINI_API_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` nunca se expone con prefijo `VITE_`: no viaja al cliente.
- Los flujos de GitHub Actions usan `${{ github.token }}` y `${{ secrets.NUVA_AGENCY_API_BASE_URL }}` (opcional).

---

## 6. Hallazgos de seguridad (Frente F)

| ID | Hallazgo | Gravedad | Ubicación |
|----|----------|----------|-----------|
| F-01 | **Mecanismos de autenticación de worker inconsistentes**: `worker-auth.ts` (REST + token del llamante, 22 agentes, sin `push`) vs edge function OIDC JWT (13 agentes, con `push`). | Alta | `src/lib/agency/worker-auth.ts`; `supabase/functions/nuva-agency-worker-control/worker-claims.ts` |
| F-02 | **RLS bypassado por `service_role`** en todo el control plane de agencia; RLS está habilitado pero sin políticas (solo defensa en profundidad). | Alta | `supabase/migrations/20261007000000_...`; rutas `/api/owner/*`; edge function |
| F-03 | **CORS abierto** (`*`) en el edge function de control de agencia. | Media | `supabase/functions/nuva-agency-worker-control/index.ts` |
| F-04 | **Ejecución de script de servidor sin gate de aprobación** (`agency-execute`, `execFile`, solo owner). | Media | `src/routes/api/owner/agency-execute.ts` |
| F-05 | **`.env.local` presente en disco** con secretos reales; protegido solo por `.gitignore`. | Media | `.env.local` (local, no versionado) |
| F-06 | `worker-auth.ts` requiere `status = "in_progress"`; el edge function valida claims OIDC sin esa restricción de estado. Diferentes estados de confianza. | Baja | Mismo que F-01 |
| F-07 | `getServerSupabaseEnv().ok` no exige `SUPABASE_SERVICE_ROLE_KEY`; rutas pueden fallar en runtime si falta. | Baja | `src/lib/supabase-env.server.ts` |
| F-08 | `platform_role = "owner"` se gestiona fuera de banda (dashboard / `service_role`); no hay procedimiento documentado de rotación ni revisión de quién tiene el rol. | Media | `src/lib/agency/owner-auth.server.ts`; configuración externa de Supabase |

**No se revelan valores de secretos, tokens ni credenciales en este informe.**

---

## 7. Controles de aprobación propuestos

### 7.1 Acciones del control plane de agencia que requieren aprobación del owner
Ya existe la tabla `agency_approvals` con `risk_level` (`medium`, `high`, `critical`) y `status` (`pending`, `approved`, `rejected`, `expired`). Se propone formalizar:

| Acción | Quiere la solicita | Quiere la aprueba | Registro |
|--------|-------------------|-------------------|----------|
| Creación de misión duradera | Worker o owner | Owner | `agency_approvals` + `agency_events` (`mission.created`) |
| Cambio de estado de misión (pausar/cancelar/reanudar) | Owner | Owner (auto-aprobación registrada) | `agency_events` |
| Finalización de tarea con `waiting_approval` | Worker | Owner | `agency_approvals` → `approval.decided` |
| Ejecución de script vía `agency-execute` | Owner | Owner (doble confirmación en UI) | Log de ejecución + `agency_events` |
| Cambio de RLS o privilegios productivos | Owner / seguridad | Owner (nunca auto-aprobación delegada) | Migración SQL + `audit_log` |
| Asignación / rotación de `platform_role = "owner"` | Seguridad | Owner + segunda persona (cuatro ojos) | Configuración de Supabase + evidencia |

### 7.2 Controles técnicos a implementar
1. **Unificar autenticación de worker:** migrar `worker-auth.ts` a verificación OIDC JWT (misma lógica que `worker-claims.ts`); unificar listas de agentes a los 13 del flujo de trabajo; eliminar `push` de eventos permitidos si no es requerido (mantener `schedule` + `workflow_dispatch`).
2. **Aislamiento RLS real:** crear políticas RLS explícitas sobre tablas `agency_*` para `authenticated` (lectura propia del owner si aplica) y revisar que `service_role` se use solo en backend de confianza. Documentar por qué se bypassa RLS.
3. **CORS restrictivo:** reemplazar `*` por los orígenes del dominio de producción (`nuva-one.vercel.app` y localhost en desarrollo).
4. **Gate de aprobación para `agency-execute`:** exigir entrada pendiente en `agency_approvals` (`risk_level = 'critical'`) aprobada por owner antes de ejecutar `agency-task-executor.mjs`, o al menos registrar la aprobación en `agency_events` con `decided_by`.
5. **Rotación de `SUPABASE_SERVICE_ROLE_KEY`:** programa de rotación y revisión de acceso; alarmas si se usa desde IP inesperada.
6. **Revisión de propietarios:** revisión trimestral de usuarios con `platform_role = "owner"` en Supabase Auth.
7. **Evitar exposición de datos sensibles:** los endpoints de agencia y métricas operativas ya excluyen remuneraciones, contratos y documentos personales; mantener esa restricción y no agregar campos sensibles a `agency_events.payload` ni a respuestas de API.
8. **Registro de auditoría inalterable:** `agency_events` y `audit_log` append-only; `decided_by`/`decided_at` en aprobaciones; verificar que ningún endpoint permite borrar `audit_log`.

---

## 8. Plan de auditoría (recurrente)

| Frecuencia | Actividad | Evidencia esperada |
|------------|-----------|--------------------|
| Cada despliegue | Verificar que `.env.local` / `.env` no estén versionados (`git status --ignored`) | Commit limpio de secretos |
| Semanal | Revisar `agency_approvals` pendientes y `agency_events` de nivel `error`/`warn` | Lista de aprobaciones pendientes |
| Mensual | Revisar usuarios con `platform_role = "owner"` y miembros `admin` por negocio | Informe de acceso privilegiado |
| Mensual | Rotación de claves de proveedor de IA y billing (Groq, Stripe, Mercado Pago, Meta) | `[REDACTED]` — constancia de rotación |
| Trimestral | Revisar políticas RLS y privilegios de `service_role`; validar que no haya políticas anuladas | Informe de estado RLS |
| Trimestral | Prueba de aislamiento: usuario no-owner no puede leer tablas `agency_*` ni tablas `people_*` sensibles | Pruebas de seguridad (tenant/user A no lee B) |
| Trimestral | Revisar endpoints expuestos y cabeceras CORS | Inventario de endpoints |
| Anual | Revisión completa del modelo de seguridad (docs/SECURITY.md) y procedimientos de cuatro ojos | Informe anual de seguridad |

---

## 9. Lista de acciones que requieren aprobación del owner (cambios de RLS / permisos productivos)

Esta lista es el mínimo gobernante para el Frente F. Ninguna de estas acciones puede ejecutarse únicamente por un worker autónomo ni por auto-aprobación delegada:

1. Cambios a políticas RLS de cualquier tabla productiva (crear, alterar, eliminar, desactivar).
2. Concesión o revocación de privilegios (`GRANT`/`REVOKE`) sobre tablas productivas, especialmente `service_role`, `anon`, `authenticated`.
3. Cambio de `platform_role = "owner"` o asignación de rol `admin` en `business_members`.
4. Modificación de funciones `SECURITY DEFINER` (incluidas `agency_claim_task`, `agency_heartbeat`, `agency_finish_task`, `people_employees_limited`).
5. Cambios a variables de entorno de servidor que contengan secretos (`SUPABASE_SERVICE_ROLE_KEY`, claves de pago/IA/Meta/n8n).
6. Ejecución de migraciones SQL en producción que afecten tablas financieras, de nómina o de control de agencia.
7. Ejecución de scripts arbitrarios del servidor vía `/api/owner/agency-execute`.
8. Creación o modificación de aprobaciones de riesgo `critical` en `agency_approvals` (debe decidir el owner, no el agente solicitante).
9. Desactivación o modificación de políticas de `audit_log` o cualquier mecanismo de auditoría.

Cada cambio debe dejar constancia en `audit_log` (o `agency_events` para acciones de agencia) con `decided_by`, fecha y justificación, y mantenerse disponible para la revisión trimestral del plan de auditoría.

---

## 10. Conclusión

El control plane de Nüva Agency tiene una base sólida: RLS habilitado en tablas de agencia, datos sensibles de People aislados con políticas owner/admin, autenticación owner mediante `platform_role`, aprobación de acciones existentes en `agency_approvals`, auditoría de eventos, y secretos fuera del repositorio (`.env` gitignorado, `.env.example` con placeholders).

Las debilidades principales son la **duplicación inconsistente de la autenticación OIDC de workers** (F-01), el **bypass total de RLS vía `service_role`** (F-02), el **CORS abierto** (F-03) y la **ejecución de scripts de servidor sin gate de aprobación** (F-04). Ninguno expone secretos en el repositorio, pero todos deben corregirse antes de considerar el frente F como listo para producción.

**No se exponen valores de secretos, tokens ni credenciales en este documento.**