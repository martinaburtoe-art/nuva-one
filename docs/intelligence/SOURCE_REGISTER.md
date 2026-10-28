# SOURCE_REGISTER — Nüva One (2026-10-24)

Registro de fuentes primarias consultadas, con fecha de consulta y qué afirmación respalda cada una. Regla: una afirmación técnica sin fuente aquí listada es una hipótesis o una recomendación, no un hecho. Las URLs se verificaron el **2026-10-24** salvo indicación explícita.

## 1. Registros oficiales de paquetes (npm — vía `npm view`, terminal, 2026-10-24)

| Consulta | Respalda | Resultado verificado |
|---|---|---|
| `npm view fast-check` | Versión/licencia/actividad fast-check | 4.10.2 · MIT · mod. 2026-09-19 |
| `npm view @playwright/test` | Playwright | 1.64.1 · Apache-2.0 · mod. 2026-10-24 |
| `npm view @sentry/react` | Sentry SDK JS | 11.9.0 · MIT · mod. 2026-10-23 |
| `npm view promptfoo` | promptfoo | 0.125.0 · MIT · mod. 2026-10-23 |
| `npm view evalite` | evalite (repo: mattpocock/evalite) | 0.19.0 · mod. 2026-02-20 |
| `npm view langfuse` | SDK JS antiguo (no recomendado) | 3.39.2 · mod. 2026-10-22 |
| `npm view @langfuse/client` y `@langfuse/vercel-ai-sdk` | Integración AI SDK | 6.0.2 · MIT · mod. 2026-10-22 |
| `npm view squawk-cli` | Squawk | 2.70.0 · (Apache-2.0 OR MIT) · mod. 2026-10-15 |
| `npm view dependency-cruiser` | dependency-cruiser | 18.7.0 · MIT · mod. 2026-10-23 |
| `npm view lighthouse` / `@lhci/cli` | Lighthouse / LHCI | 13.5.0 (mod. 2026-10-24) / 0.15.1 (mod. 2025-06-25 → semiestancado) |
| `npm view msw` | MSW | 3.0.3 · MIT · mod. 2026-10-10 |
| `npm view knip` | knip | 6.42.1 · ISC · mod. 2026-10-19 |
| `npm view transbank-sdk` | SDK oficial Transbank Node | 6.1.1 · BSD-3-Clause · mod. 2025-12-09 |
| `npm view web-vitals` | web-vitals | 6.2.3 · Apache-2.0 · mod. 2026-10-05 |
| `npm view supabase-test-helpers` | Inexistencia de paquete | **404** (no publicado en npm) |

## 2. GitHub API (vía `gh api repos/...` + `releases/latest`, terminal, 2026-10-24)

| Repo | Respalda | Verificado |
|---|---|---|
| dubzzz/fast-check | Actividad, licencia | MIT · 5.212★ · push 2026-10-24 · v4.10.2 (2026-09-19) |
| microsoft/playwright | Actividad, licencia | Apache-2.0 · 98.390★ · push 2026-10-24 · v1.64.1 (2026-10-14) |
| getsentry/sentry-javascript | Licencia SDK (archivo LICENSE) | **MIT** · 8.766★ · push 2026-10-23 · 11.9.0 (2026-10-23) |
| woodruffw/zizmor | Actividad, licencia | MIT · 6.766★ · push 2026-10-23 · v1.31.1 (2026-10-15) |
| gitleaks/gitleaks | Actividad, "feature complete" | MIT · 30.280★ · push 2026-10-23 · v8.30.1 (2026-03-21) |
| google/osv-scanner | Actividad, licencia | Apache-2.0 · 11.255★ · push 2026-10-23 · v2.7.0 (2026-10-12) |
| langfuse/langfuse (+LICENSE) | Licencia dual MIT core / ee comercial | 36.276★ · push 2026-10-24 · v4.69.0 (2026-10-23) |
| promptfoo/promptfoo | Actividad, licencia | MIT · 26.358★ · push 2026-10-24 · 0.125.0 (2026-10-23) |
| mattpocock/evalite | Actividad, licencia | MIT · 1.722★ · push 2026-04-28 · 0.19.0 (2025-11-06) |
| sbdchd/squawk | Actividad, reglas, Action | Apache-2.0 · 1.229★ · push 2026-10-24 · v2.70.0 (2026-10-15) |
| usebasejump/supabase-test-helpers | Estancamiento (sin releases) | MIT · 132★ · push **2024-05-15** |
| TransbankDevelopers/transbank-sdk-nodejs | Actividad, licencia | BSD-3-Clause · 55★ · push 2026-09-28 · 6.1.1 (2025-12-09) |
| ossf/scorecard | Actividad | Apache-2.0 · 5.784★ · push 2026-10-24 · v5.6.0 (2026-10-12) |
| GoogleChrome/lighthouse | Actividad | Apache-2.0 · 30.930★ · push 2026-10-24 · v13.5.0 (2026-09-18) |
| sverweij/dependency-cruiser | Actividad, licencia | MIT · 7.324★ · push 2026-10-23 |

## 3. Documentación oficial de herramientas (extraídas 2026-10-24)

| URL | Respalda |
|---|---|
| https://fast-check.dev | "Works well with Jest, Mocha, Vitest" (agnóstico del runner); property-based testing JS/TS |
| https://playwright.dev/docs/auth | Patrón `storageState` + `playwright/.auth` + advertencia de no commitear estados de auth |
| https://playwright.dev/docs/test-snapshots | `toHaveScreenshot()` con umbrales; baselines por navegador/plataforma; `--update-snapshots` |
| https://docs.zizmor.sh/audits/ | Reglas zizmor: template-injection, artipacked, dangerous-triggers, unpinned actions, advisories de Actions |
| https://github.com/sbdchd/squawk (README) | Reglas (`require-concurrent-index-creation`, `constraint-missing-not-valid`, `prefer-text-field`), Action, `.squawk.toml`, pre-commit |
| https://github.com/gitleaks/gitleaks (README) | Aviso "feature complete"/Betterleaks; modos git/dir/stdin; pre-commit + GitHub Action; `.gitleaksignore`; formatos de reporte |
| https://google.github.io/osv-scanner/ | CLI para CI/CD + lib Go; frontend oficial de la BD OSV |
| https://langfuse.com/integrations/frameworks/vercel-ai-sdk | Integración AI SDK: paquete 6.x apunta a **AI SDK 7**; para **v6** vía heredada con `experimental_telemetry` + LangfuseSpanProcessor |
| https://promptfoo.dev/docs/providers/openai/ | `apiBaseUrl` + `apiKeyEnvar` para gateways OpenAI-compatibles |
| https://evalite.dev | "Built on Vitest"; export estático para CI con umbrales que fallan el build |
| https://vercel.com/docs/speed-insights (+ /quickstart) | Speed Insights: gratis en todos los planes (RES); CWV completos en Plus (pago) |
| https://github.com/getsentry/sentry-javascript/blob/master/LICENSE | SDK JS con licencia MIT (archivo consultado vía API, 2026-10-24) |

## 4. Fuentes oficiales chilenas (extraídas 2026-10-24)

| URL | Respalda |
|---|---|
| https://www.sii.cl/servicios_online/1039-menu_certificacion-1184.html | SII: vías oficiales de factura electrónica ("desarrollo propio o solución de mercado"); ambiente de certificación; servicios con certificado digital (*); "Documentación API RPETC" (única API documentada en la página, para cesión de créditos) |
| https://www1.sii.cl/TMP/InfoP001/GuiaPortalMIPYME_V3.pdf | Guía oficial del Portal MIPYME: emisión web manual con certificado digital; "Instrucciones de Uso Técnico" para componentes de software |
| https://www.chileatiende.gob.cl/fichas/13505-emision-de-documentos-tributarios-electronicos-dte-portal-mipyme | Descripción oficial del trámite: portal web gratuito, RUT + clave tributaria o ClaveÚnica, certificado digital |
| DNS `developers.sii.cl` (nslookup, 2026-10-24) | **NXDOMAIN** → no existe portal público de developers del SII en ese dominio |
| DNS `palena.sii.cl` (200.10.252.213) y https://palena.sii.cl/dte/menu.html | Host oficial del SII para verificación de documentos/contribuyentes (páginas web, no API pública documentada para terceros) |
| https://www2.sii.cl/stc/noauthz/consulta | Página oficial de consulta de situación tributaria de terceros (web) |
| https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/index_API_sec1_es.htm | API **gratuita** de la Base de Datos Estadísticos (BDE) del Banco Central: REST/SOAP/Python; indicadores oficiales (UF, UTM, dólar) |
| https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/ayuda_soporte.html | Requisitos: cuenta BDE + token en "Mi Cuenta"; acceso "inmediato y gratuito"; códigos UF `F073.UFF.PRE.Z.D`, UTM `F073.UTR.PRE.Z.M` |
| https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/Webservices/Terms%20of%20use%20API_EN.pdf | Términos de uso oficiales de la API (uso indefinido y sin costo, revocable por el BCCh) |
| https://www.transbankdevelopers.cl/documentacion/como_empezar | Webpay REST oficial: ambiente de integración gratuito con códigos predefinidos (Webpay Plus `59705555555532`); SOAP deprecado |
| https://www.transbankdevelopers.cl/producto/webpay | Descripción oficial de Webpay Plus (autorización financiera de pagos con tarjetas/débito) |
| https://nuevo.leychile.cl (Decreto 9/2023, MinSegPres) | ClaveÚnica: mecanismo oficial "de uso exclusivo para personas naturales"; integración para órganos de la Administración |
| https://wikiguias.digital.gob.cl/terminos-y-condiciones/terminos-condiciones-claveunica | Términos SGD: entidades privadas solo con habilitante normativo/convenio; solicitud vía trámite oficial; criterios (incl. fiscalización por institución pública) |
| https://www.hacienda.cl/noticias-y-eventos/noticias/gobierno-digital-entrega-recomendaciones-para-un-correcto-uso-de-claveunica | Uso limitado a plataformas del Estado y privadas autorizadas por convenio (AFP, AFC, firma electrónica) |

**Fuentes TERCERAS (marcadas, no oficiales — usadas solo como indicio):**
- https://www.apigateway.cl/products/sii/portal-mipyme y /docs — wrapper comercial del portal SII; declaran cubrir funcionalidad que "el SII no expone oficialmente vía servicios web" (indicio de ausencia de API pública).
- https://apipyme.cl — wrapper comercial de RCV/F29 con credenciales SII del contribuyente.

## 5. Hermes Skills Hub (terminal, 2026-10-24)

| Consulta | Respalda |
|---|---|
| `hermes skills search` en 22 temas (ver SKILLS_CATALOG §1) | Inventario de skills disponibles por área; ausencia de skills oficiales/trusted para RLS/migraciones/evals IA/observabilidad/Chile |
| `hermes skills inspect openai/skills/.curated/gh-fix-ci` | SKILL.md completo: procedimiento gh + plan + aprobación explícita antes de implementar |
| `hermes skills search supabase` | 3 variantes community + oficiales duplicadas por la ya instalada |

## 6. Evidencia interna reutilizada (no re-auditada en esta fase)

| Fuente | Qué respalda |
|---|---|
| `package.json` (leído 2026-10-24) | Stack real: React 19.2, Vite 8.3.4, TS 5.6.2, TanStack Router/Start 1.x, Tailwind 4.2.1, supabase-js 2.108.2, `ai` 6.0.208, stripe 22.3, vitest 4.1.11, eslint 10, happy-dom; scripts `verify:*`, `agency:*`, `factory:*` |
| `docs/audit/SKILLS_AND_TOOLS.md` (2026-10-21) | Skill oficial `supabase` v0.1.2 instalada/validada; gh CLI PASS; supabase CLI 2.109.1; bloqueos Vercel/Supabase token |
| Baseline de auditoría (2026-10-22, vía `docs/intelligence/README.md` §4) | 308/308 vitest, pgTAP 50 archivos en CI, RLS en tablas públicas, gaps SEC-02/SEC-03, bloqueador E2E #4, DRIFT-01, CWV UNKNOWN, lint 56 errores, DEP-01/02, PR #227 |
| `docs/FASE4_Comparacion_Proveedores_DTE.md` | Comparativa DTE y recomendación OpenFactura (reutilizada, no re-auditada) |
| `docs/INTEGRATIONS_ROADMAP.md` | Regla de frontera server-side ("External secrets never reach browser code"); contratos de integración |
| Existencia de `docs/MERCADO_PAGO_SETUP.md` | MercadoPago ya en proceso interno |

## 7. Afirmaciones deliberadamente NO verificadas (vigilancia)

- **Precios vigentes** de Sentry (tiers/limites) y de OpenFactura/Haulmer: solo se enlaza la página oficial para confirmar al momento de activar; no se citan cifras.
- **Costos de producción de Transbank**: no públicos (afiliación comercial) [HECHO].
- **Betterleaks** (sucesor anunciado de Gitleaks): sin release estable verificada en la fecha de consulta.
- **Disponibilidad de Stripe para pymes chilenas**: fuera de alcance de esta fase (no se re-audita; la decisión de pagos pasa por MercadoPago/Transbank).
- Cualquier benchmark de rendimiento: no se ejecutaron pruebas en esta fase; no hay métricas inventadas.
