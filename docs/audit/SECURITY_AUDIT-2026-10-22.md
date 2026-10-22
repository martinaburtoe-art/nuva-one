# SECURITY_AUDIT — Nüva One

Fecha: 2026-10-22 (inicio de misión: 2026-10-21 23:17) · Auditor: Hermes Agent (JARVIS)
Método: análisis estático de código + migraciones SQL + sondeos REST de solo lectura + `npm audit`.
Estados: PASS / WARN / FAIL / UNKNOWN / BLOCKED. Severidades: P0 (crítico) a P3 (mejora).
**Nota de alcance**: la verificación directa contra la base de datos real está BLOCKED (sin `SUPABASE_ACCESS_TOKEN` ni cuenta de prueba). Los hallazgos de BD son evidencia de migraciones + comportamiento REST observado; se indica qué requiere confirmación.

## Resumen ejecutivo

| ID | Severidad | Título | Estado |
|---|---|---|---|
| SEC-01 | **P0 (candidato)** | 21 tablas vivas sin RLS declarada, consultadas por el frontend con filtro de tenant solo en aplicación | CONFIRMADO en código/migraciones; impacto en BD: verificar |
| SEC-02 | P2 | `main` sin branch protection (push directo = despliegue a producción) | CONFIRMADO |
| SEC-03 | P2 | Sin CSP (Content-Security-Policy) en vercel.json | CONFIRMADO |
| SEC-04 | P2 | 11 vulnerabilidades npm (8 high) — todas en toolchain de desarrollo | CONFIRMADO |
| SEC-05 | P3 | `dangerouslySetInnerHTML` en 2 puntos (QR MFA + shadcn chart) | WARN, riesgo bajo |
| SEC-06 | PASS | Sin secretos hardcodeados en el repo | CONFIRMADO |
| SEC-07 | PASS | Clave service-role confinada a módulos servidor (`*.server.ts`, rutas API) | CONFIRMADO |
| SEC-08 | PASS | Denegación por defecto al rol anónimo en Data API (sondeo REST) | CONFIRMADO |
| SEC-09 | P2 | Interferencia de antivirus (Defender real-time) durante instalaciones — riesgo operativo | CONFIRMADO (evidencia: access violations en node.exe) |

## SEC-01 — Tablas sin RLS (detalle y evidencia)

Análisis de las 297 migraciones (`supabase/migrations/*.sql`): 142 tablas creadas, 16 dropeadas, 121 con `ENABLE ROW LEVEL SECURITY` declarado. **21 tablas vivas sin RLS declarada en migraciones**:

`audit_log`, `customers`, `products`, `sales`, `purchases`, `quotes`, `suppliers`, `transactions`, y el módulo People completo: `people_attendance_events`, `people_compliance_items`, `people_contracts`, `people_documents`, `people_employees`, `people_leave_requests`, `people_lre_exports`, `people_org_units`, `people_payroll_items`, `people_payroll_periods`, `people_payroll_postings`, `people_payroll_runs`, `people_requests`.

Evidencia de consulta directa del frontend (JWT de usuario autenticado, rol `authenticated`) con filtro de tenant **solo en el cliente**:

- `src/components/nuva-action-center.tsx:28,30` — `supabase.from("sales")...eq("business_id", bid)`, `from("transactions")`
- `src/components/shipments/ShipmentsWorkspaceV2.tsx:72,81` — `from("customers").select("*")`, `from("sales")`
- `src/lib/use-nuva-score.ts:63,72,78` — `from("transactions")`, `from("sales")`
- `src/components/audit-log-view.tsx:87` — `from("audit_log")`
- `src/lib/business-context.server.ts:39,45,64` — consultas servidor con service-role (ese lado está bien)

Riesgo: si el rol `authenticated` tiene GRANTs (default de Supabase en esquema public), **cualquier usuario autenticado de cualquier empresa puede leer/modificar datos de otras empresas** omitiendo el `.eq("business_id", ...)`. El sondeo REST con rol anon resultó en `42501 permission denied` (SEC-08) — eso solo prueba que anon no tiene GRANT; el rol `authenticated` es el que usa el frontend.

**Verificación pendiente (BLOCKED)**: confirmar en la BD real (a) si RLS fue habilitada fuera de migraciones (dashboard), (b) grants del rol authenticated, (c) prueba práctica con dos usuarios de prueba. Requiere `SUPABASE_ACCESS_TOKEN` o cuenta de prueba.
**Remediación propuesta** (sin ejecutar — requiere autorización por impacto): migración que habilite RLS en las 21 tablas + políticas por `business_id` reutilizando el patrón de las 121 tablas que ya la tienen; luego pruebas de aislamiento con dos usuarios.

## SEC-02 — `main` sin protección de rama

`GET /branches/main/protection` → 404. Cualquier push a `main` dispara despliegue a producción (integración Git de Vercel activa). Recomendación: branch protection + PR obligatorio + checks. Decisión del propietario.

## SEC-03 — Headers presentes, CSP ausente

`vercel.json` define X-Content-Type-Options, Referrer-Policy, X-Frame-Options DENY, HSTS — **PASS parcial**. Falta `Content-Security-Policy`. Añadir CSP requiere inventario de orígenes (Supabase, Stripe/MercadoPago, Meta, fuentes) — propuesta en fase de implementación con vista previa.

## SEC-04 — Dependencias vulnerables (todas dev-toolchain)

`npm audit`: 11 (8 high, 3 moderate). Cadenas: `minimatch` 10.0.0 ReDoS (vía eslint/glob/archiver), `launch-editor` RCE dev-only, `@vitest/mocker` inyección en mocks. **Ninguna dependencia de runtime del producto**. Remediación: bump override `minimatch` ≥10.2.6 + `npm audit fix` (paso corto, en cola).

## SEC-05 — XSS puntuales

- `src/components/mfa-setup.tsx:142` — `dangerouslySetInnerHTML={{ __html: enrolling.qr }}`: el SVG proviene del flujo de inscripción MFA (fuente: API auth). Riesgo bajo si el QR no es manipulable por terceros; sanitizar o renderizar como imagen data-URI sería más seguro.
- `src/components/ui/chart.tsx:73` — patrón estándar shadcn (inyección de CSS de colores del chart, valores internos). Riesgo bajo.

## SEC-06 / SEC-07 / SEC-08 — Verificaciones satisfactorias

- **SEC-06**: grep de patrones `sk_live|rk_live|pk_live` + claves en código: sin coincidencias. `.env.example` contiene solo nombres (38 vars) sin valores.
- **SEC-07**: `SUPABASE_SERVICE_ROLE_KEY` se lee de `process.env` SOLO en `src/integrations/supabase/client.server.ts` y `src/lib/supabase-env.server.ts`; importadores exclusivamente módulos servidor y rutas API (`src/routes/api/billing/*`, `src/lib/rate-limit.server.ts`, etc.). Patrón correcto; confirmar además que ningún chunk cliente referencia el símbolo (revisión de bundle en fase de build).
- **SEC-08**: sondeo REST con publishable key (válida, extraída del bundle): `42501 permission denied` en tablas expuestas; 404 en no expuestas al anon. Denegación por defecto correcta para anónimos.

## SEC-09 — Riesgo operativo: antivirus

Windows Defender con real-time activo (verificado). Durante la reinstalación, `esbuild` postinstall murió con ACCESS VIOLATION (0xC0000005) y npm con 0xC0000142 — mismo patrón que la sesión previa. Recomendación: excluir `C:\Users\marti\Documents\nuva-one` y la caché npm de Defender (acción del usuario, requiere admin), o activar exclusión durante instalaciones.

## Riesgos residuales y siguientes pasos

1. **Verificar SEC-01 en la BD** (bloqueado por credenciales) — máxima prioridad de seguridad.
2. Activar branch protection (SEC-02) — decisión del propietario.
3. CSP (SEC-03) + bump minimatch (SEC-04) — implementables de inmediato, en cola.
4. Revisión de bundle cliente post-build: confirmar ausencia de símbolos server-only (SEC-07).
5. Secrets: sin exposiciones detectadas; `.env` local inexistente (las claves viven en Vercel — no auditable sin login).
