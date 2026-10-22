# ARCHITECTURE_AUDIT — Nüva One

Fecha: 2026-10-22 · Auditor: Hermes Agent (JARVIS) · Fuente: inspección estática del repo + docs previos consolidados (01-arquitectura, 05-matriz, FINDINGS, PROGRESS)

## 1. Stack verificado (package.json + builds ejecutados)

React 19.2 · TypeScript 5.6.2 · Vite 8.3.4 (rolldown) + @lovable.dev/vite-tanstack-config · TanStack Router 1.170.41 + Start 1.168.60 (SSR nitro, preset vercel) · Tailwind 4.2 + tw-animate-css · Radix UI (shadcn) · @supabase/supabase-js 2.108 · Stripe 22 · AI SDK 6 (`@ai-sdk/openai-compatible`, `ai`) · recharts 2.13 (peer-deuda React 19) · react-hook-form + zod 4.6.7 · Capacitor 8 (build Android) · vitest 4 + happy-dom · ESLint 10 (react-hooks v7).

## 2. Mapa funcional (evidencia: `src/routes/`)

- **42 rutas autenticadas** (`src/routes/_authenticated/`): dashboard, pos, sales, quotes, customers, catalog, inventory (+operaciones, conteo, scanner móvil), purchases, finance (+accounting, professional, integrity, SII), caja-control, people (+attendance, compliance, employees, lifecycle, payroll), analytics, billing, nuva-intelligence, customer-action-center/intelligence, executive-command-center, business-health/simulator, pricing-calculator, settings, help-center, mfa-required, conexiones, ai...
- **API servidor** (`src/routes/api/`): billing (mercadopago, payments, subscribe con webhook + callback + cancel), chat, business/explain, integrations-events/webhook, cron/nuva-intelligence-worker. Crons declarados en vercel.json: `run-charges` diario 13:00, `nuva-intelligence-worker` diario 00:00.
- **Rutas públicas**: index (home cinematico), auth, pricing, noticias, negocios (directorio), foro, demo, checkout(+demo), onboarding, owner(+owner/), experience...
- **Módulo "agency"** (subsystem autónomo): scripts npm `agency:*` (sentinel, qa, correlate, persist, certify, gateway, dependency-audit), edge functions `nuva-agency-*`, migraciones de control-plane (leases, audit runs, recover). CI en GitHub ejecuta 5+ workflows programados alrededor de este subsystem.

## 3. Capa de datos y auth

- Cliente público: `src/integrations/supabase/client.ts` + `auth-attacher.ts`/`auth-middleware.ts`; tipos generados (`types.ts`).
- Admin (service-role): `src/integrations/supabase/client.server.ts` + `src/lib/supabase-env.server.ts` — solo importado por rutas API/módulos server (verificado, SECURITY_AUDIT SEC-07).
- Contexto de negocio multiempresa: `src/lib/business-context.server.ts`; el cliente filtra por `business_id` en aplicación — ver SECURITY_AUDIT SEC-01 (RLS).
- BD: **297 migraciones**, 7 edge functions (`nuva-agency-ai-broker`, `nuva-agency-worker-control`, `nuva-telegram-agency`, `owner-create-complimentary-account`, `owner-metrics`, `owner-operational-metrics`, `platform-telemetry`).

## 4. Deuda técnica demostrable

1. **Doble lockfile**: `bun.lock` + `package-lock.json` coexisten (Lovable usa bun; Vercel usa npm). El estado actual se instaló con npm; `bun.lock` quedó desincronizado. Decisión pendiente del propietario: unificar (recomendado: npm como fuente de verdad por vercel.json).
2. Archivos `.bak` en raíz (`package.json.bak`, `tsconfig.json.bak`, `vite.config.ts.bak`, `bun.lock.backup`): eliminar tras validar (no hacen nada, solo ruido).
3. 5 CSS experimentales de home en `src/` (`editorial-home-experience-*.css`, `home-cinematic-*.css`) + `styles.css` + `home-experience.css` + `nuva-motion-system.css` — dispersión de estilos a consolidar en el sistema de diseño.
4. `recharts` 2.13 con peer < React 19: funciona con `--legacy-peer-deps`; migración real a v3 pendiente.
5. 56 errores de las reglas nuevas react-hooks v7 (setState en effects, impurezas en render) + 624 `no-explicit-any` — pasadas de refactor progresivas.
6. Radix con `react-popper` anidado duplicado (dedup pendiente).

## 5. Fortalezas confirmadas

- Build de producción VERDE (cliente+SSR) tras reparación; 308 tests pasando; typecheck limpio.
- Code-splitting maduro (autoCodeSplitting del router + librerías pesadas diferidas).
- Separación server/cliente rigurosa (`*.server.ts` + rutas API).
- Cobertura de seguridad razonable en headers y denegación anon (ver SECURITY_AUDIT).
- Contract AGENTS.md con reglas de equipo/anti-loop — respetado en esta misión.

## 6. Siguientes pasos recomendados (orden)

1. Confirmar SEC-01 (RLS) en BD — bloquea la confianza del multiempresa (P0 candidato).
2. Unificar lockfile + eliminar .bak + commit de la reparación (preparado, pendiente autorización de push).
3. Pase de lint: 56 errores react-hooks por módulo, empezando por rutas críticas (pos, sales, inventory).
4. Migración recharts v3 con QA visual.
5. E2E (Playwright) sobre preview con cuenta de prueba.
