---

## 6. Indicadores de negocio (verificables en el repositorio)

### Técnicos / de calidad (evidencia actual)
- Tests: `429/429 PASS` (vitest, 97 archivos); especialistas People `40/40`; OIDC/worker `14/14`.
- Calidad: `npm run lint` exit 0 (696 warnings preexistentes); `npx tsc --noEmit` exit 0; `npm run agency:certify` PASS (13 especialistas).
- CI: PR #269 8/8 success (lint, typecheck, test, audit, build, pgTAP, production-smoke, review, safety-gate, verify, web-qa).
- Infra: Supabase proyecto Nüva One ACTIVE_HEALTHY; 6 Edge Functions ACTIVE; 10 despliegues preview Ready, 2 producción (11h).
- Carga: 1.850/1.850 requests en gate ephemeral 10/25/50/100 VU; p95 366 ms, p99 547 ms; inventario sin oversell en 25/50/100 VU.
- Código: `main` local 88 commits detrás de origin/main; 9 archivos sin staged; 15 PRs MERGEABLE/CLEAN.

### Comerciales (definir y rastrear en beta)
| Indicador | Definición | Fuente esperada | Meta inicial (beta) |
|---|---|---|---|
| ARPU | Ingreso mensual promedio por negocio | billing `subscription_charges` / `businesses` | Start $11.990 / Pro $27.990 CLP |
| Conversión trial → pago | Negocios que pasan de Starter gratuito a plan pagado | `subscription_status`, `billing_plan` | — (baseline por definir) |
| Churn mensual | Negocios que downgradan a canceled tras 3 cobros fallidos | `billing_failed_attempts >= 3` → `canceled` | < 5 % |
| Margen de contribución % | (Ingreso neto − costos variables asignables) / Ingreso neto | modelo de costos Finance | Positivo por plan (PRICING_MODEL §9) |
| Costo IA / ingreso | Tokens entrada/salida, modelo, proveedor, costo estimado por request | `ai_usage_events` | Guardrail: optimizar contexto/modelo antes de subir precios |
| Activación onboarding | % de negocios que emiten primera venta/factura en ≤ 7 días | `onboarding` + primer documento | — (baseline por definir) |
| Retención de agencia | Tareas de agency completadas vs fallidas (una vez T-20 aplicado) | `agency_tasks`, `agency_missions` | — (baseline por definir) |

---

## 7. Mejoras implementables con evidencia (no solo ideas)

Cada ítem incluye base de evidencia, archivo, pasos y criterio de aceptación. Los marcados **requieren autorización del owner** no pueden ejecutarse sin ella.

| ID | Mejora | Evidencia / base | Archivo(s) | Pasos implementables | Dueño | Criterio de aceptación |
|---|---|---|---|---|---|---|
| M-01 | Aplicar grants remotos a tablas `agency_*` | T-20 bloqueado; issue #260 | `supabase/migrations/20261030130000_agency_service_role_privileges.sql` | Owner autoriza; aplicar migración remota; verificar `service_role` SELECT/INSERT en agency_tables | Release + owner (autorización) | `supabase db query` remoto exitoso; persistencia `persistCycle → persistExecution → finalizeMission` 7/7 OK remoto |
| M-02 | Desplegar OIDC hardening en Edge Function | commit `e28f67e` 14/14 PASS local; T-32 | `supabase/functions/nuva-agency-worker-control/index.ts` | Owner autoriza deploy; desplegar v16 endurecida; verificar `supabase functions list` | Security + owner | Edge remota con hardening; tests worker-oidc-claims 14/14 remotos |
| M-03 | Test unitario de `run-charges.ts` (sin dinero real) | W-6: sin tests propios; idempotencia ya en arquitectura | `src/routes/api/billing/subscribe/run-charges.ts` + nuevo `run-charges.server.test.ts` | Escribir pruebas de idempotencia por `commerce_order`, salto de paid/rejected, reclamación de processing stale >30 min | QA | `vitest` del nuevo test PASS; suite general sigue 429/429 |
| M-04 | Documentar integración SII DTE local (cumple T-70) | AGENT_BACKLOG T-70 (investigación sin llamadas externas) | Crear `docs/launch/SII_DTE_INTEGRACION.md` | Documentar flujo OpenFactura + modo asistido Portal MiPyme, validación `validate_sii_dte_core`, idempotencia de folios, no-manejo-de-claves-SII | Finance / Compliance | Documento publicado y revisado por Compliance; cubre T-70 aceptación |
| M-05 | Resolver duplicidad de lockfiles | W-2: `bun.lock` + `package-lock.json` | `package.json`, `bun.lock`, `package-lock.json` | Elegir un lockfile canonical; eliminar el duplicado o sincronizar; verificar `npm ci` reproducible | Finance / Constructor | `npm ci` limpio; un solo lockfile |
| M-06 | Coherencia de dominio SEO (sitemap) | `src/routes/sitemap[.]xml.ts` `BASE_URL = https://nuvaone.cl` vs producción `.vercel.app` | `src/routes/sitemap[.]xml.ts`, `vercel.json` | Definir dominio canónico; actualizar BASE_URL; agregar `robots.txt` con sitemap; verificar headers de seguridad ya presentes | Growth / UX | Sitemap sirve URLs del dominio canónico; `robots.txt` accesible |
| M-07 | Activar analítica y conector Odoo | W-5: Odoo/GTM/GA no declarados | `vercel.json`, código de Growth | Conectar GTM/GA (datos de mirax.cl y nuva-one); evaluar conector Odoo o API directa para clientes que lo usen | Growth / Sales | GTM/GA activo en producción; plan de adopción Odoo documentado |
| M-08 | Conectar Slack para alertas de Sentinel | W-4 / F4: Slack no autenticado vía `manage_connections` | Conexión OAuth workspace Slack | Conectar Slack vía `manage_connections`; configurar canal de alertas del bot Sentinel | Sentinel / Orchestrator | `slack.SEND_MESSAGE` operativo; alerta de prueba recibida |
| M-09 | Mercado Pago: conectar o retirar | W-4: código huérfano sin ruta/webhook | `src/lib/fiscal/mercadopago-subscriptions.server.ts` | Decidir: (a) agregar ruta + webhook de pago, o (b) retirar código y tests huérfanos | Finance / Compliance | Ruta activa y testeada, o código eliminado sin rotura de tests |
| M-10 | Onboarding con pista de avance y métrica de activación | `/onboarding` existe sin progreso guiado | `src/routes/onboarding.tsx` | Agregar pasos con indicador de avance, disparo de evento al completar, métrica "primer documento de venta en ≤ 7 días" | UX / Product | Tasa de activación medible; evento de finalización de onboarding registrado |

**Ítems que puedo ejecutar sin autorización del owner (repositorio local, ramas de trabajo, sin merge):** M-03 (test), M-04 (documentación), M-05 (sincronizar lockfiles), M-06 (SEO/dominio), M-09 (decisión Mercado Pago), M-10 (onboarding). Los ítems M-01, M-02, M-07, M-08 requieren credenciales/autorización de terceros (Supabase remoto, deploy Vercel, OAuth Slack/GTM).

---

## Cómo se debe usar este reporte

1. El owner autoriza M-01 y M-02 (Supabase grants + deploy OIDC) — eso desbloquea T-20/T-21/T-22 y hace duradera a la agencia.
2. QA ejecuta M-03 y revalida `429/429` + `lint` + `typecheck`.
3. Se publica M-04 (cumple T-70) y se resuelve W-4 (Mercado Pago).
4. Con P0 resuelto, se mezcla #263/#266/#269 y se fija #270 antes del siguiente release de producción.
5. Los indicadores de la sección 6 se instrumentan en Supabase (`businesses`, `subscription_charges`, `ai_usage_events`, `agency_tasks`) y se revisan semanalmente en el Control Tower durante la beta.

Archivos consultados para este reporte (todos en `C:\Users\marti\Documents\nuva-one`): `docs/launch/AGENCY_OPERATIONS_BOARD.md`, `AGENCY_EVIDENCE_LOG.md`, `AGENCY_EXECUTION_MATRIX.md`, `AGENCY_AGENT_CAPABILITIES.md`, `AGENCY_CONNECTIONS.md`, `SECURITY_BOUNDARIES.md`, `PROJECT_STATE.md`, `LAUNCH_ROADMAP.md`, `MATRIZ_LANZAMIENTO_INTEGRAL.md`, `BLOCKERS.md`, `ARQUITECTURA_PAGOS.md`, `PRICING_MODEL.md`, `BETA_READINESS_RUNBOOK.md`, `NUVA-ONE-PYME-MOAT-CHILE.md`, `100-client-readiness.md`, `NUVA_AGENCY_ARCHITECTURE.md`, `CORE_INTEGRATION_AUDIT_2026-09-27.md`, `FASE4_Comparacion_Proveedores_DTE.md`, `docs/nuva-agency/AGENT_BACKLOG.md`, `src/lib/agency/specialists.ts`, `src/lib/plan-config.ts`, `src/routes/sitemap[.]xml.ts`, `src/routes/onboarding.tsx`, `scripts/agency-task-executor.mjs`, `vercel.json`, `supabase/migrations/` y `supabase/tests/database/061_sii_dte_core_validation.sql`.
