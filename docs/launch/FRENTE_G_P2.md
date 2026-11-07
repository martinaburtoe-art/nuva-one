---

## 2. Funcionalidades que realmente necesitan los clientes (enfoque PYME chilena)

Según `docs/NUVA-ONE-PYME-MOAT-CHILE.md` (tesis de producto) y `docs/PRICING_MODEL.md`, el moat no es copiar el alcance de Odoo/Defontana/Bsale, sino **inteligencia de decisión sobre datos operativos y cumplimiento chileno**. Las funcionalidades launch-critical (grupo S del moat) son las que los clientes realmente necesitan para operar en Chile:

1. **Motor DTE chileno (SII):** factura, boleta, notas de crédito/débito, guía de despacho, folios, XML, firma, estados de respuesta del SII, reintento/idempotencia, auditoría. Estado en repo: módulo de facturación SII vía **OpenFactura (Haulmer)** — el negocio pega su propio certificado digital; Nüva One **nunca maneja certificados ni claves del SII directamente** (`supabase/migrations/20260801200000_billing_sii.sql`). También existe **modo asistido**: el usuario emite en el Portal MiPyme del SII (gratis, sin API) y registra el folio real aquí (`20260805180000_billing_sii_manual_mode.sql`). Función de BD `validate_sii_dte_core` con pruebas pgTAP (`supabase/tests/database/061_sii_dte_core_validation.sql`).
2. **Centro de control RCV/F29:** conciliar ventas/compras internas con registros tributarios disponibles, exponer discrepancias y preparar flujo de revisión. Planificado, no implementado como módulo terminado.
3. **Core financiero:** engine de contabilidad, plan de cuentas, IVA, cobros/pagos, P&L, balance, flujo de caja (`finance_accounting_engine_v2.sql`, `professional_financial_tax_control.sql`, `tax_working_papers`, `tax_periods`).
4. **Nüva CFO:** explicar posición financiera y proponer próximas acciones con datos del negocio (regla de oro: ninguna operación financiera/tributaria/irreversible se ejecuta solo por recomendación de IA — confirmación explícita del usuario).
5. **Inventario 3.0:** ciclo de vida SKU/código de barras, conteos cíclicos, ajustes de stock, predicción de reabastecimiento, sugerencias de compra con margen. Migración `20260715120000_fix_stock_oversell_race_condition.sql` evidencia cuidado con condiciones de carrera.
6. **Radar de cumplimiento:** obligaciones chilenas versionadas, fechas efectivas, evidencia y responsable. T-81 documenta normativa (SII, UF septiembre 2026, mínimo legal).

**Onboarding y soporte (gaps detectados):**
- Ruta `/onboarding` existe (`src/routes/onboarding.tsx`): nombre, industria, tamaño, objetivo (ventas/inventario/finanzas/clientes), y `supabase.rpc("create_demo_business_for_current_user")` con `localStorage` `novaflow.active_business_id`. No hay pista de avance guiada, ni envío de invitaciones al equipo, ni verificación post-onboarding (métrica: % de negocios que completan onboarding y emiten primera factura/venta).
- Soporte activo: bot de Telegram `@marti_manoderecha_bot` (gateway OK). Slack no conectado — canal de alertas y soporte perdido. No hay help-center público ni widget de chat detectado en la homepage revisada (`https://nuva-one.vercel.app`: módulos ventas, inventario, finanzas, CRM).

**Posicionamiento comercial:** no posicionar como clon más barato de Bsale/Defontana/Nubox (`docs/NUVA_MASTER_CONTEXT.md`). Perfil público y Red de Contactos gratis para todo usuario autenticado, sin gateo por plan (`docs/PRICING_MODEL.md` §7).

---

## 3. Errores comerciales y operativos detectados

### Errores/bloqueos (bloquean lanzamiento o operación segura)

| # | Error | Evidencia | Gravedad |
|---|---|---|---|
| E-1 | Persistencia de agencia en Supabase remoto bloqueada (grants no aplicados) | `docs/launch/PROJECT_STATE.md` B-002; issue #260 (12 tareas failed, service_role sin privilegios) | Crítica — detiene operación duradera de la agencia |
| E-2 | Hardening OIDC no desplegado en Edge Function remota (v16 sin endurecimiento) | commit `e28f67e` local, 14/14 PASS; T-32 bloqueado por autorización de deploy | Alta — tokens/heartbeats del worker sin endurecimiento remoto |
| E-3 | PR #270 con 1 check fallando (lint/typecheck/test/audit/build) | `PROJECT_STATE.md` PR tabla | Media — puede romper CI si se mergea sin revisar |
| E-4 | 2 PRs conflictivos sin resolver (#247, #236) | `AGENCY_EVIDENCE_LOG.md` entrada 44 | Media — ruido en la cola de release |
| E-5 | Despliegue de producción rechazado por Vercel `build-rate-limit` | `docs/100-client-readiness.md` release note | Media — límite de plataforma, no de código; afecta release de hotfixes |

### Advertencias operativas (no bloquean, pero erosionan confianza)

| # | Advertencia | Evidencia |
|---|---|---|
| W-1 | `.env.local` presente (posible secreto expuesto); `.env` y `.env.production` no encontrados | `AGENCY_EVIDENCE_LOG.md` entrada 29; `SECURITY_BOUNDARIES.md` regla 1-2 |
| W-2 | `bun.lock` + `package-lock.json` coexisten (posible inconsistencia si `package.json` cambió después) | entrada 47 del evidence log |
| W-3 | 11 archivos con patrones `sk-/pk-/secret/key/token` (referencias de variable, sin valores expuestos) | entrada 43 |
| W-4 | Mercado Pago es código huérfano: `src/lib/fiscal/mercadopago-subscriptions.server.ts` sin ruta ni webhook activo | `docs/launch/ARQUITECTURA_PAGOS.md` §9 |
| W-5 | Odoo, GTM/GA no declarados (sin conector ni analítica) | entradas 48, 49 del evidence log; matriz de aplicaciones |
| W-6 | Sin test end-to-end real de cobro recurrente (sandbox o mock); `run-charges.ts` sin tests unitarios propios | `ARQUITECTURA_PAGOS.md` §9 |
