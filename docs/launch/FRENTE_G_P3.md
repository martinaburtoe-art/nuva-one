---

## 4. Prioridades de lanzamiento

### P0 — Bloqueantes (requieren autorización del owner, no reversibles sin ella)

1. **Aplicar migración de grants remota** `20261030130000_agency_service_role_privileges.sql` en Supabase (T-20) → habilita persistencia duradera de la agencia (tareas, misiones, eventos, leases, approvals, artifacts).
2. **Desplegar endurecimiento OIDC** a Edge Function `nuva-agency-worker-control` (T-32, commit `e28f67e`).
3. **Activar worker duradero y scheduler** remoto (T-21, depende de T-20 + T-32).
4. **Habilitar sesión real de Owner Console** para el dueño (T-22, depende de T-20/T-21).
5. **Mergear PRs #263, #266, #269** (CI 8/8, MERGEABLE) y revisar #270 (1 check fallando) antes de cualquier release.

### P1 — Gates de beta (objetivo evidencia, no solo UI sana)

Según `docs/BETA_READINESS_RUNBOOK.md`:
- CI de `main` verde end-to-end; pgTAP en stack Supabase limpio; typecheck/lint/tests/build verdes.
- Supabase Auth: `password_hibp_enabled=true`, política de longitud de contraseña y verificación de email intencionales, redirect URLs de producción solo en dominios aprobados. (Configuración de hosting; no hay herramienta expuesta desde el repo.)
- Proveedores IA: clave primaria y al menos una fallback configurada; variables de precio por provider; prueba de petición primaria y fallback controlado; verificar `ai_usage_events` registra provider, model, tokens, attempts, fallback flag.
- Prueba de carga en staging (no producción): 10 → 25 → 50 → 100 VU, detener ante cualquier fallo; grabar p50/p95/p99, error rate, duración. Gate actual: p95 < 1500 ms, p99 < 3000 ms, cero acceso cross-tenant, cero fallos. Último gate ephemeral: 1.850/1.850 requests, p95 366 ms, p99 547 ms.
- Recuperación: backups de Supabase activos, un drill de restore/restauración en no-producción, migraciones reconstruyen DB limpia.
- Control Tower mostrando métricas de plataforma, IA (request/token/costo), distribución de provider, count de fallbacks, sin incidentes críticos sin resolver, evidencia de carga de prueba adjunta al release.

### P2 — Hito normativo (Chile)

- **Certificación de mercado SII** como gate de lanzamiento para operación DTE certificada (`NUVA-ONE-PYME-MOAT-CHILE.md`). Preparar para **1 de diciembre de 2026** (Ley 21.719 de protección de datos personales) y las etapas de jornada 42h → 40h (Ley 21.561).

### P3 — Crecimiento y experiencia (post-beta)

- Conectar Google Tag Manager / Google Analytics (W-5), conector Odoo (ventas/inventario de clientes), Slack para alertas de Sentinel.
- Consistencia SEO: `sitemap.xml` usa `BASE_URL = https://nuvaone.cl` mientras producción está en `https://nuva-one.vercel.app` — definir dominio canónico y agregar `robots.txt` si falta.
- Onboarding con pista de avance y métrica de activación (primer documento de venta/factura emitido en los primeros 7 días).

---

## 5. Checklist financiero y tributario Chile (SII / TAX_CHILE)

| Área | Ítem | Estado en repo | Referencia |
|---|---|---|---|
| IVA | Precios internos separados neto vs con IVA; IVA chileno 19% no confundirse con ingreso neto de Nüva | Documentado | `docs/PRICING_MODEL.md` §1 |
| Planes de suscripción Nüva One | Start $11.990 CLP / Pro $27.990 CLP mensual; anual ≈ 16,7% descuento; fuente única `plan-config.ts` | Implementado | `src/lib/plan-config.ts`, `PRICING_MODEL.md` |
| Cobros a clientes del negocio | Dual Flow / VSB; webhooks con idempotencia (`payment_webhook_events` provider+token); verificación server-to-server (no confiar solo en POST) | Implementado | `docs/launch/ARQUITECTURA_PAGOS.md` §2 |
| Suscripciones de negocio a Nüva One | Flow únicamente (`FLOW_SUBSCRIPTIONS_*`); `run-charges` cron diario 13:00; ahora cubre Start y Pro (fix T-34); idempotencia por `commerce_order = sub-{biz.id}-{period}`; stale processing 30 min | Implementado | `ARQUITECTURA_PAGOS.md` §3-8; `vercel.json` crons |
| Mercado Pago | Código huérfano, sin ruta ni webhook | Pendiente (conectar o retirar) | `ARQUITECTURA_PAGOS.md` §9 |
| DTE / facturación electrónica SII | Vía OpenFactura (Haulmer): el negocio trae su certificado; Nüva no toca claves SII. Modo asistido: emisión en Portal MiPyme SII + registro de folio aquí | Implementado (asistido) | migraciones `20260801200000_billing_sii.sql`, `20260805180000_billing_sii_manual_mode.sql` |
| Validación DTE núcleo | Función `validate_sii_dte_core` con pruebas pgTAP (factura imponible válida, montos inconsistentes rechazados, business_id inexistente, etc.) | Implementado en BD | `supabase/tests/database/061_sii_dte_core_validation.sql` |
| Contabilidad e impuestos | `tax_working_papers`, `tax_periods`, engine contable v2; asientos scoped por tenant y periodo | Implementado | migraciones `20260818214500_finance_accounting_engine_v2.sql`, `20260818214706_professional_financial_tax_control.sql` |
| Libro de Remuneraciones Electrónico (SII) | Tabla `people_lre_rows` | Implementado | migraciones `*people_rls_select_hardening.sql` |
| UF | Valores UF septiembre 2026 seedados con fuente `sii.cl/valores_y_fechas/uf/uf2026.htm` | Implementado | `supabase/migrations/20260923041000_people_uf_september_2026.sql` |
| Normativa chilena aplicable | SII, UF septiembre 2026, mínimo legal documentado (T-81) | Documentado (pendiente de publicar como evidencia) | `AGENT_BACKLOG.md` T-81 |
| Integración SII DTE local | Investigación documentada sin llamadas a API externas (T-70) | Pendiente de documento de evidencia | `AGENT_BACKLOG.md` T-70 |
| Protección de datos | Preparar para 1-dic-2026 (Ley 21.719); export/borrado/acceso de datos personales | Planificado (moat §B) | `NUVA-ONE-PYME-MOAT-CHILE.md` |
| Jornada laboral | Reglas versionadas 42h → 40h (Ley 21.561) | Planificado | `NUVA-ONE-PYME-MOAT-CHILE.md` |

**Acciones inmediatas del checklist:** publicar documento de integración SII DTE local (cumple T-70), decidir Mercado Pago (conectar webhook o retirar código huérfano), agregar test unitario a `run-charges.ts`, verificar `password_hibp_enabled` y redirect URLs en Supabase Auth hosting.
