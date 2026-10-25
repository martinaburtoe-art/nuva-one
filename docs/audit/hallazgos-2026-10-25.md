# Auditoria Nüva One — Hallazgos de arquitectura y TypeScript

**Fecha:** 2026-10-25  •  **Rama:** `fix/resumen-fullscreen-dashboard-20261017`  •  **HEAD:** 0928e8c6  •  **Ámbito:** `src/` (lectura y correcciones locales seguras; sin commits, pushes ni cambios de producción)

## Baseline verificada

| Check | Resultado |
|---|---|
| `tsc --noEmit` | PASS (exit 0) |
| `vite build` | PASS |
| `vitest` | 308/308 pasando |
| ESLint | 56 errores, 645 advertencias |

`tsconfig.json` tiene `noUnusedLocals: false` y `noUnusedParameters: false`, por lo que tsc **no** detecta código muerto ni variables sin usar.

## Resumen por prioridad

| Prioridad | Cantidad | Significado |
|---|---|---|
| P0 | 0 | Sin bloqueos de carga ni caídas en arranque |
| P1 | 24 | Riesgo de runtime: cascadas/bucles de render y promesas rechazadas sin manejar |
| P2 | 6 grupos | Defectos claros con impacto contenido (efectos render, refs en render, promesas flotantes, `any`) |
| P3 | 3 grupos | Mantenimiento: código muerto, dependencia innecesaria, libs solo de tests |

## Hallazgos (P1 — corregibles localmente, seguros)

| ID | Archivo:Línea | Categoría | Hallazgo | Corregible local/seguro |
|---|---|---|---|---|
| P1-01..P1-23 | `src/routes/__root.tsx:149`; `src/routes/_authenticated/dashboard.tsx:29`; `src/routes/_authenticated/inventario-conteo.tsx:47`; `src/routes/_authenticated/mobile-scanner.tsx:47`; `src/routes/_authenticated/pos.tsx:128` y `:156`; `src/routes/_authenticated/settings.tsx:40` y `:189`; `src/routes/checkout.tsx:73`; `src/routes/owner/control-tower.tsx:157` y `:276`; `src/hooks/use-mobile.tsx:14`; `src/components/editorial-home-experience-scenes.tsx:27`; `src/components/global-search.tsx:88`; `src/components/home-fixed-experience.tsx:26`; `src/components/home-product-preview.tsx:414`; `src/components/inventory-count-panel.tsx:29`; `src/components/mfa-setup.tsx:30`; `src/components/nuva-info-center.tsx:262`; `src/components/product-code-registry.tsx:117`; `src/components/pyme-news-hub.tsx:65`; `src/components/pyme-news-hub-v2.tsx:236`; `src/components/pyme-news-radar.tsx:162`; `src/components/ui/carousel.tsx:98` | Efecto React | `setState` invocado síncronicamente dentro del cuerpo de un `useEffect` (regla `react-hooks/no-direct-set-state`). En React 19 puede provocar cascadas de render o bucles infinitos. | Sí: mover la actualización de estado dentro de un callback de evento/temporizador o ajustar el array de dependencias |
| P1-24 | `src/routes/foro/$topicId.tsx:63` | Promesa sin gestionar | `supabase.rpc("increment_forum_topic_views", {...}).then();` — promesa flotante sin `.catch` ni `await`; si falla el RPC genera rechazo no manejado | Sí: agregar `.catch(() => undefined)` o envolver en `try/catch` con `await` |

## Hallazgos (P2)

| ID | Archivo:Línea | Categoría | Hallazgo | Corregible local/seguro |
|---|---|---|---|---|
| P2-01..P2-26 | `src/components/crm-action-center.tsx:55`; `src/components/dashboard-shell.tsx:61`; `src/components/inventory-action-center.tsx:152`; `src/components/nuva-decision-memory.tsx:21` y `:26`; `src/components/nuva-decision-outcomes.tsx:17`, `:21`, `:26`; `src/components/nuva-decision-timeline.tsx:33` y `:153`; `src/components/nuva-execution-score.tsx:11` y `:13`; `src/components/nuva-executive-command-center.tsx:68`; `src/components/nuva-operating-pulse.tsx:64`; `src/components/nuva-predictive-signals.tsx:42` y `:58`; `src/components/ui/sidebar.tsx:643`; `src/routes/_authenticated/business-health.tsx:51`; `src/routes/_authenticated/nuva-intelligence.tsx:38`; `src/routes/_authenticated/people-compliance.tsx:15`; `src/routes/_authenticated/quotes.tsx:439`; `src/routes/_authenticated/settings.tsx:139`; `src/routes/owner/control-tower.tsx:276` | Efecto/render | Llamada a función impura durante el render (consultas Supabase, `Date()`, etc. en cuerpo de componente). React puede renderizar el componente varias veces y ejecutar el efecto secundario durante el render | Sí: mover a `useEffect` o manejador de evento; revisar caso a caso |
| P2-27..P2-30 | `src/components/ai-chat-bubble.tsx:40`; `src/components/nuva-launch-experience.tsx:44`; `src/components/public-ai-chat-widget.tsx:82`; `src/routes/_authenticated/ai.tsx:121` | React refs | Acceso a `ref.current` durante el render (regla `react-hooks/refs`) | Sí: usar callback ref o acceder al ref solo en efectos/manejadores |
| P2-31 | `src/components/finance-tools-hub.tsx:58` | Render | Tres asignaciones `window.location.href = "..."` que eslint rechaza ("This value cannot be modified") | Sí: usar `navigate()` de TanStack Start / `<Link>` |
| P2-32..P2-39 | `src/components/ai-chat-bubble.tsx:30`; `src/components/public-ai-chat-widget.tsx:40`; `src/lib/use-auth.ts:15`; `src/routes/checkout.tsx:66`; `src/routes/auth.tsx:37`; `src/routes/onboarding.tsx:69`; `src/routes/select-business.tsx:19`; `src/routes/reset-password.tsx:36` | Promesa sin gestionar | `supabase.auth.getSession()` / `getUser().then(...)` sin `.catch`; el rechazo queda contenida por el handler global `unhandledrejection` de `src/routes/__root.tsx:180`, pero no se maneja en el sitio | Sí: agregar `.catch` o `try/catch` con `await` |
| P2-40..P2-42 | `src/components/home-cinematic-experience.tsx` (dep `'scene.id'`); `src/components/inventory-count-panel.tsx:29` (dep `'refresh'`); `src/routes/_authenticated/analytics.tsx` (dep `'saleMatchesProductOrCategory'`) | Efecto con deps incorrectas | `useEffect`/`useMemo` con dependencia faltante (`exhaustive-deps`) → cierres obsoletos y datos desactualizados en UI | Sí: agregar la dependencia faltante o quitar el array |
| P2-43 | `src/components/costs-workspace.tsx` (líneas 34-42, 87); `src/components/dashboard-shell.tsx:59-60`; `src/components/finance-accounting-workspace-v2.tsx` (varias); `src/components/finance-accounting-workspace.tsx` (varias); `src/routes/foro/$topicId.tsx` (varias); `src/routes/__root.tsx:101` (`ErrorComponent as any`) | Tipos `any` | Uso masivo de `any` (`(x: any)`, `as any`, `catch (err: any)`, `Record<string, any>`, props tipados como `any`). tsc pasa porque los tipos están relajados, pero pierden cobertura de tipos en dominio financiero | Sí, pero esfuerzo alto: tipar progresivamente archivo por archivo |

## Hallazgos (P3 — mantenimiento, sin impacto en runtime)

| ID | Alcance | Hallazgo | Corregible local/seguro |
|---|---|---|---|
| P3-01 | 22 componentes de app nunca importados | `src/components/business-insight-card.tsx`, `competitive-ops-hub.tsx`, `finance-accounting-workspace.tsx` (v1, supersedido por v2), `finance-intelligence-card.tsx`, `home-cinematic-experience.tsx`, `home-command-center.tsx`, `home-product-preview.tsx`, `module-information.tsx`, `module-motion-label.tsx`, `nuva-launch-experience.tsx`, `purchases-product-analytics.tsx`, `pyme-news-hub.tsx`, `pyme-news-hub-v2.tsx`, `pyme-news-intelligence.tsx`, `pyme-news-radar.tsx`, `sales-intelligence-card.tsx`, `shipments-analytics.tsx`, `src/components/demo/cinematic-bridge.tsx`, `src/components/demo/demo-clean-workspace.tsx`, `src/components/nuva/FloatingActionPillar.tsx`, `src/components/shipments/ShipmentsWorkspace.tsx` (v1) | Sí: eliminar tras confirmar que no se usan dinámicamente |
| P3-02 | 22 primitivos shadcn/ui nunca importados | `ui/alert.tsx`, `ui/alert-dialog.tsx`, `ui/aspect-ratio.tsx`, `ui/avatar.tsx`, `ui/breadcrumb.tsx`, `ui/carousel.tsx`, `ui/chart.tsx`, `ui/collapsible.tsx`, `ui/context-menu.tsx`, `ui/drawer.tsx`, `ui/form.tsx`, `ui/hover-card.tsx`, `ui/input-otp.tsx`, `ui/menubar.tsx`, `ui/navigation-menu.tsx`, `ui/pagination.tsx`, `ui/radio-group.tsx`, `ui/resizable.tsx`, `ui/scroll-area.tsx`, `ui/sidebar.tsx`, `ui/slider.tsx`, `ui/sonner.tsx`, `ui/toggle-group.tsx` | Sí: eliminar si no se planean usar |
| P3-03 | Libs sin importadores en la app | `src/lib/monthly-report.ts`, `src/lib/product-image.ts`, `src/lib/pyme-radar-release.ts`, `src/lib/pyme-radar-release-2.ts`, `src/lib/ai-gateway/tool-registry.ts`, `src/lib/nuva-learning/index.ts`, `src/lib/nuva-learning/nuva-server-trust.ts`, `src/lib/people/payroll-engine.ts`, `src/integrations/lovable/index.ts`, `src/integrations/supabase/auth-middleware.ts`, `src/types/form-data-text-fields.d.ts` | Sí: verificar que ningún script de `scripts/` los invoque dinámicamente antes de eliminar |
| P3-04 | 38 archivos de `src/lib/` importados solo por tests | Incluye `src/lib/finance-period.ts` (tras el fix aplicado, solo usado por su test), `nuva-action-execution.ts`, `nuva-autopilot.ts`, `nuva-cfo-engine.ts`, `nuva-predictive-engine.ts`, `plan-access.ts`, `webhook-security.server.ts`, `lib/agency/{incident,registry,remediation}.ts`, entre otros | Sí: código de app muerto; mantener solo si scripts externos los requieren |
| P3-05 | `src/components/purchases-product-analytics.tsx` | `useMemo` con dependencia innecesaria (`'products'`, advertencia `exhaustive-deps`) | Sí: quitar dependencia sobrante |

## Verificaciones negativas (sin hallazgo)

| Área | Qué se verificó | Resultado |
|---|---|---|
| Rutas rotas | 11 importaciones perezosas (`lazy`) resueltas y con export default nombrado existente (`nuva-operating-pulse`, `pos-barcode-scanner`, `dashboard-chart`, `finance-accounting-workspace-v2`, `finance-advanced-tools`, `finance-sii-workspace`, `nuva-financial-control`, `collection-priority-panel`, `sales-product-analytics`, `demo/demo-workspace`, `lib/demo/demo-state`); `routeTree.gen.ts` referencia todos los archivos de `src/routes`; `tsc` y `build` pasan | Sin rutas rotas ni componentes lazy rotos |
| Listeners sin limpiar | 63 sitios `addEventListener`/`removeEventListener`; suscripciones Supabase `.on(` / `.subscribe(` (incl. `src/lib/use-business.ts:33`, `src/routes/__root.tsx:180`) | Todos tienen su `removeEventListener` / función de limpieza en el return del efecto |
| Efectos revisados a fondo | `src/components/editorial-home-experience-v2.tsx` (useProgress, deps `[ref]`, limpieza scroll/resize/frame), `src/lib/use-business.ts` (listener storage con cleanup), `src/components/home-command-center.tsx` (interval con `clearInterval`), `src/lib/live-scanner.ts` (timers con `clearInterval`), `src/routes/_authenticated/route.tsx` (listener de auth + `unhandledrejection` con cleanup) | Deps y limpieza correctas |
| Rutas del dashboard (archivos clave revisados previamente) | `dashboard.tsx`, `module-guard.tsx`, `use-business.ts`, `supabase/client.ts`, `_authenticated/route.tsx` | Sin hallazgos adicionales más allá de los listados arriba |

## Recomendaciones

1. **P1 primero:** envolver el RPC de `foro/$topicId.tsx:63` y mover los 23 `setState` de cuerpo de efecto a manejadores/eventos o dependencias correctas.
2. **P2:** eliminar llamadas impuras durante render (26), accesos a refs en render (4), navegación vía `window.location` en `finance-tools-hub.tsx:58`, y adicionar `.catch` a las 8 promesas de sesión de auth.
3. **Dependencias de efectos:** corregir las 3 advertencias `exhaustive-deps` (P2) y la dependencia innecesaria en `purchases-product-analytics.tsx` (P3).
4. **Código muerto:** pasar P3-01 a P3-04 a revisión y eliminar lo no usado (no afecta runtime, reduce tamaño de bundle y confusión).
5. **Tipado:** activar progresivamente `@typescript-eslint/no-explicit-any` (actualmente hay cientos de advertencias) empezando por dominio financiero.

No se modificó ningún archivo de producción; no se hicieron commits ni pushes. El único artifacto de auditoría nuevo es este informe (`docs/audit/hallazgos-2026-10-25.md`).