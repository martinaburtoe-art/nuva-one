# TECH_RADAR — Nüva One (2026-10-24)

Decisiones del radar tecnológico con matriz de puntuación (0–5) y riesgos críticos separados.
Convención de afirmaciones: **[HECHO]** comprobado con evidencia verificable (URL oficial/registro/API en `SOURCE_REGISTER.md`) · **[HIPÓTESIS]** beneficio esperado sin probar en el proyecto · **[RECOMENDACIÓN]** juicio del evaluador.
Regla crítica: una puntuación total alta **nunca** compensa una vulnerabilidad grave o una licencia incompatible; por eso cada entrada lista sus riesgos por separado.

Dimensiones: **V** valor para Nüva One · **C** compatibilidad con el stack real (React 19.2 + TS 5.6 + Vite 8.3 + Vitest 4.1 + TanStack Start 1.x + Tailwind 4.2 + Supabase/PostgreSQL/RLS/pgTAP + GH Actions + Vercel + AI SDK 6.0.208) · **M** madurez · **Mt** mantenibilidad de la integración · **S** seguridad/procedencia.

Definiciones del radar: **ADOPTAR** incorporar (valor/seguridad/compatibilidad demostrados) · **ADAPTAR** aprovechar la idea o el código ajustándolo · **CONSTRUIR** desarrollar capacidad propia · **EXPERIMENTAR** probar aislado antes de decidir · **VIGILAR** seguimiento sin instalar · **DESCARTAR** no usar, con motivo documentado.

---

## Resumen de decisiones

### Testing, QA y contratos

| # | Candidato | Área | V | C | M | Mt | S | Total | Decisión |
|---|---|---|---|---|---|---|---|---|---|
| 1 | fast-check 4.10.2 (MIT) | Pruebas por propiedades | 5 | 5 | 5 | 5 | 5 | 25 | **ADOPTAR** |
| 2 | Playwright 1.64.1 (Apache-2.0) | E2E autenticado + regresión visual | 5 | 5 | 5 | 4 | 5 | 24 | **ADOPTAR** |
| 3 | Squawk 2.70.0 (Apache-2.0/MIT) | Lint de migraciones Postgres | 5 | 5 | 5 | 5 | 5 | 25 | **ADOPTAR** |
| 4 | `supabase gen types` (CLI oficial ya instalada) | Contrato TS ↔ Postgres | 4 | 5 | 5 | 5 | 5 | 24 | **ADOPTAR** |
| 5 | MSW 3.0.3 (MIT) | Mock de red para tests | 3 | 4 | 5 | 4 | 5 | 21 | **VIGILAR** |
| 6 | supabase-test-helpers (usebasejump, MIT) | Pruebas RLS multi-tenant | 4 | 4 | 2 | 2 | 4 | 16 | **ADAPTAR** |

### Seguridad y cadena de suministro

| # | Candidato | Área | V | C | M | Mt | S | Total | Decisión |
|---|---|---|---|---|---|---|---|---|---|
| 7 | Zizmor 1.31.1 (MIT) | Auditoría estática de GitHub Actions | 5 | 5 | 5 | 5 | 5 | 25 | **ADOPTAR** |
| 8 | Gitleaks 8.30.1 (MIT) | Detección de secretos | 4 | 5 | 5 | 5 | 5 | 24 | **ADOPTAR** |
| 9 | OSV-Scanner 2.7.0 (Apache-2.0) | Vulnerabilidades transitivas/SBOM | 3 | 4 | 5 | 4 | 5 | 21 | **EXPERIMENTAR** |
| 10 | OSSF Scorecard 5.6.0 (Apache-2.0) | Postura de seguridad del repo | 2 | 3 | 4 | 5 | 5 | 19 | **VIGILAR** |

### Observabilidad y rendimiento

| # | Candidato | Área | V | C | M | Mt | S | Total | Decisión |
|---|---|---|---|---|---|---|---|---|---|
| 11 | Vercel Speed Insights (oficial Vercel) | CWV en usuarios reales | 4 | 5 | 5 | 5 | 5 | 24 | **ADOPTAR** |
| 12 | web-vitals 6.2.3 (Apache-2.0) | RUM propio si se necesita | 3 | 5 | 5 | 5 | 5 | 23 | **ADAPTAR** |
| 13 | Sentry (@sentry/react 11.9.0, SDK MIT) | Errores en producción | 5 | 5 | 5 | 4 | 4 | 23 | **ADOPTAR** |
| 14 | Lighthouse 13.5.0 + @lhci/cli 0.15.1 | Lab CWV en CI | 3 | 4 | 4 | 3 | 5 | 19 | **VIGILAR** |

### Ingeniería de IA

| # | Candidato | Área | V | C | M | Mt | S | Total | Decisión |
|---|---|---|---|---|---|---|---|---|---|
| 15 | promptfoo 0.125.0 (MIT) | Evals de prompts/proveedores | 4 | 5 | 5 | 4 | 4 | 22 | **EXPERIMENTAR** |
| 16 | evalite 0.19.0 (MIT) | Evals LLM sobre Vitest | 4 | 5 | 3 | 3 | 5 | 20 | **EXPERIMENTAR** |
| 17 | Langfuse + @langfuse/vercel-ai-sdk 6.0.2 | Trazas/coste del gateway IA | 4 | 3 | 5 | 3 | 3 | 18 | **EXPERIMENTAR** |

### Arquitectura y dependencias

| # | Candidato | Área | V | C | M | Mt | S | Total | Decisión |
|---|---|---|---|---|---|---|---|---|---|
| 18 | dependency-cruiser 18.7.0 (MIT) | Reglas de frontera de código | 4 | 5 | 5 | 4 | 5 | 23 | **EXPERIMENTAR** |
| 19 | knip 6.42.1 (ISC) | Deps muertas | 5 | 5 | 5 | 5 | 5 | 25 | **ADOPTAR** (ya en curso, PR #227) |
| 20 | Atlas (ariga) | Gestión de esquemas | 2 | 2 | 4 | 3 | 5 | 16 | **DESCARTAR** |

### Integraciones chilenas (solo fuentes oficiales)

| # | Candidato | Área | V | C | M | Mt | S | Total | Decisión |
|---|---|---|---|---|---|---|---|---|---|
| 21 | API Banco Central (si3.bcentral.cl) | UF/UTM/USD oficiales | 4 | 5 | 5 | 5 | 5 | 24 | **ADOPTAR** |
| 22 | Transbank Webpay Plus REST (+ SDK Node 6.1.1) | Pagos locales | 4 | 5 | 5 | 4 | 4 | 22 | **EXPERIMENTAR** |
| 23 | OpenFactura (Haulmer) | DTE multi-RUT | 4 | 4 | 4 | 4 | 4 | 20 | **ADAPTAR** (piloto según FASE4) |
| 24 | SII directo (Portal MIPYME sin API pública) | DTE directo | 1 | 1 | 3 | 2 | 2 | 9 | **DESCARTAR** |
| 25 | ClaveÚnica (Gobierno Digital) | Identidad | 2 | 1 | 5 | 3 | 2 | 13 | **DESCARTAR** |
| 26 | API Gateway / ApiPyme (wrappers no oficiales) | Datos del portal SII | 2 | 3 | 3 | 2 | 2 | 12 | **VIGILAR** |

### Skills (detalles en `SKILLS_CATALOG.md`)

| Candidato | Procedencia | Decisión |
|---|---|---|
| gh-fix-ci | openai/skills (trusted, skills.sh) | **ADAPTAR** (base de `nuva-ci-diagnostics`) |
| playwright | openai/skills (trusted) | **EXPERIMENTAR** (cuando Playwright se adopte) |
| stripe-projects | official/payments | **VIGILAR** |
| page-agent | official/web-development | **VIGILAR** |
| Variantes community (supabase, postgres, llm-eval-harness, observability, etc.) | community | **DESCARTAR** (procedencia sin auditar y/o duplican lo ya disponible) |
| 8 skills propias Nüva (misión §9) | a construir | **CONSTRUIR** (7 confirmadas + 1 condicionada a decisión de producto) |

---

## Justificaciones y riesgos críticos

### 1. fast-check — ADOPTAR (25/25)
- **[HECHO]** Property-based testing para JS/TS, agnóstico del runner ("It works well with Jest, Mocha, Vitest" — fast-check.dev, 2026-10-24). MIT, 5.212 estrellas, push 2026-10-24, release 4.10.2 del 2026-09-19 (GitHub API + npm, 2026-10-24).
- **[HIPÓTESIS]** Casos límite en: aritmética monetaria de ventas/finanzas, concurrencia de inventario (stock bajo condizioni de carrera), generadores de payloads para pruebas RLS.
- **Riesgos:** ninguno crítico (dependencia dev-only, sin acceso a red/credenciales). El coste real es escribir invariantes correctos; empezar por los módulos de dinero.

### 2. Playwright — ADOPTAR (24/25)
- **[HECHO]** Patrón oficial de autenticación reutilizable (`storageState`, dir `playwright/.auth` ignorada por git) resuelve el bloqueador de lanzamiento #4 (E2E autenticado BLOCKED por cuentas de prueba) — playwright.dev/docs/auth (2026-10-24). Regresión visual nativa `toHaveScreenshot()` con umbrales y baselines por plataforma — playwright.dev/docs/test-snapshots (2026-10-24). Apache-2.0, release 1.64.1 del 2026-10-14 (GitHub API, 2026-10-24).
- **[RECOMENDACIÓN]** Excluir explícitamente el módulo Resumen protegido (`src/resumen-premium.css`, PR #230) de las pruebas visuales o limitarlas a detectar cambios *sin* fallar el build por su estética.
- **Riesgo:** las baselines de screenshot dependen de SO/navegador/entorno (doc oficial); hay que generarlas y ejecutar en el mismo entorno de CI. Los archivos `storageState` pueden contener cookies sensibles: nunca commitearlos (doc oficial).

### 3. Squawk — ADOPTAR (25/25)
- **[HECHO]** Linter SQL para migraciones Postgres: reglas como `require-concurrent-index-creation` (CREATE INDEX bloquea escrituras), `constraint-missing-not-valid` (constraints bloquean escrituras durante el scan) — github.com/sbdchd/squawk (2026-10-24). Apache-2.0/MIT, npm `squawk-cli` 2.70.0 del 2026-10-15, push 2026-10-24, Action oficial `sbdchd/squawk-action`, config `.squawk.toml` con exclusiones.
- **[HIPÓTESIS]** Con 297 migraciones y recovery drills en CI, previene el downtime por migraciones bloqueantes — exactamente el tipo de regresión que el pipeline actual no detecta estáticamente.
- **Riesgo:** falso positivo en migraciones ya aplicadas; ejecutar solo sobre migraciones nuevas (`supabase/migrations/` nuevas desde el último release), o con baseline.

### 4. `supabase gen types` — ADOPTAR (24/25)
- **[HECHO]** La CLI de Supabase ya está instalada (2.109.1, `docs/audit/SKILLS_AND_TOOLS.md`, 2026-10-21). Genera tipos TS desde el esquema real (contrato frontend↔BD).
- **[RECOMENDACIÓN]** Regenerar en CI y fallar si el archivo commiteado diverge del esquema migrado; complementa `verify:migrations` existente.
- **Riesgo:** tipos desactualizados si el paso de CI no existe; ninguno de seguridad.

### 5. MSW — VIGILAR (21/25)
- **[HECHO]** MIT, 3.0.3, npm 2026-10-10. Intercepción de red a nivel de Service Worker/Node.
- **[RECOMENDACIÓN]** No instalar todavía: los tests unitarios existentes (308/308 vitest) ya cubren el nivel de mock necesario; MSW aportaría al simular el gateway IA o Supabase REST en E2E, donde Playwright es la apuesta principal.
- **Riesgo:** ninguno; solo coste de mantenimiento prematuro.

### 6. supabase-test-helpers (Basejump) — ADAPTAR (16/25)
- **[HECHO]** MIT, 132 estrellas, **sin paquete npm** (404 en registry, 2026-10-24) y último push 2024-05-15 (GitHub API) → inactivo ~18 meses.
- **[RECOMENDACIÓN]** No depender del repo: **ADAPTAR** sus patrones de pruebas de aislamiento RLS (multi-tenant) dentro de la suite pgTAP propia (50 archivos, 61+ aserciones ya en CI — evidencia interna 2026-10-22).
- **Riesgo:** adoptarlo como dependencia sería bloqueante (sin releases); por eso solo se copian ideas.

### 7. Zizmor — ADOPTAR (25/25)
- **[HECHO]** Linter de seguridad para GitHub Actions: `template-injection` (inyección vía `${{ }}`), `dangerous-triggers` (p. ej. `pull_request_target`), `artipacked` (persistencia de credenciales), acciones sin fijar, y acciones con advisories públicos (docs.zizmor.sh/audits, 2026-10-24). MIT, release 1.31.1 del 2026-10-15, push 2026-10-23, funciona offline, con auto-fixes documentados.
- **[HIPÓTESIS]** Dado el volumen de workflows del proyecto (ci-repair, sentinel, web-qa, safe-merge, certificación del gateway IA — evidencia interna), es probable que existan hallazgos reales; **no** es un juicio previo sobre su seguridad.
- **Riesgo:** hallazgos pedantes (persona "auditor"); configurar severidades y no ocultar errores preexistentes (regla del proyecto: baseline explícito).

### 8. Gitleaks — ADOPTAR (24/25)
- **[HECHO]** MIT, 30.280 estrellas, release 8.30.1 del 2026-03-21. Detecta secretos en git/repos/archivos/stdin; modos pre-commit y GitHub Action (`gitleaks-action`) oficiales; formatos de reporte json/sarif; `.gitleaksignore` por fingerprint (github.com/gitleaks/gitleaks, 2026-10-24).
- **[HECHO — riesgo de mantenimiento]** El README anuncia: "Gitleaks is feature complete. I'm not merging new features… shifting my focus to Betterleaks". Sigue recibiendo parches de seguridad; la sustituta (Betterleaks) está en evolución temprana → mantenerla como ADOPTAR con **VIGILAR** a Betterleaks.
- **Riesgo:** falsos positivos en fixtures/tests; gestionar con allowlists documentadas, nunca desactivando el escaneo.

### 9. OSV-Scanner — EXPERIMENTAR (21/25)
- **[HECHO]** Frontend oficial de la BD OSV (Google), CLI para CI/CD, Go lib opcional (google.github.io/osv-scanner, 2026-10-24). Apache-2.0, release 2.7.0 del 2026-10-12.
- **[RECOMENDACIÓN]** `npm audit` ya corre en CI (`agency:dependency-audit`, package.json) → por la regla de no-duplicación, probar OSV-Scanner **no bloqueante** (job agendado) para cubrir transitivas/SBOM y licencias; decidir tras 2–3 ejecuciones.
- **Riesgo:** duplicación de ruido con npm audit; definir una única fuente de verdad de severidad si ambas quedan.

### 10. OSSF Scorecard — VIGILAR (19/25)
- **[HECHO]** Apache-2.0, release 5.6.0 del 2026-10-12. Orientado a repos open source públicos.
- **[RECOMENDACIÓN]** Ejecutarlo periódicamente como autoevaluación de postura (branch protection SEC-02, fijado de acciones) sin instalar nada en CI.
- **Riesgo:** bajo valor si el repo permanece privado; nada crítico.

### 11. Vercel Speed Insights — ADOPTAR (24/25)
- **[HECHO]** Producto oficial de Vercel: métricas basadas en Core Web Vitals de usuarios reales; "available on every plan for free" con RES; CWV completos en Speed Insights Plus (de pago) — vercel.com/docs/speed-insights (2026-10-24).
- **[RECOMENDACIÓN]** Es el cierre más barato del gap "CWV/Lighthouse UNKNOWN" (evidencia interna): ya se despliega en Vercel, sin código.
- **Riesgo:** la capa gratuita no muestra todos los CWV individuales; si se necesitan, evaluar Plus o RUM propio (web-vitals).

### 12. web-vitals — ADAPTAR (23/25)
- **[HECHO]** Apache-2.0, 6.2.3, npm 2026-10-05. Librería oficial (GoogleChrome) para medir CWV en campo.
- **[RECOMENDACIÓN]** Usarla solo si se necesita RUM propio con destinos personalizados (p. ej. tabla Supabase con agregados anónimos); en caso contrario, Speed Insights basta.
- **Riesgo:** construir RUM propio = superficie de privacidad nueva (IPs/usuarios); evitar datos identificativos.

### 13. Sentry — ADOPTAR (23/25)
- **[HECHO]** SDK JS MIT (`@sentry/react` 11.9.0, npm 2026-10-23; repo getsentry/sentry-javascript push 2026-10-23, release 11.9.0 del 2026-10-23). La plataforma es SaaS con plan gratuito y de pago (verificar condiciones vigentes en sentry.io/pricing antes de activar).
- **[RECOMENDACIÓN]** Cubre el objetivo "diagnóstico de errores en producción sin exponer datos": activar scrubbing de PII desde el día 1, encriptar `sendDefaultPii: false`, y revisar qué datos cruzan la frontera (cumplir `docs/OWNER_CONSOLE_PRIVACY.md`).
- **Riesgo (crítico, gestiona la decisión):** es un tercero que recibe payloads de error. Sin configuración de scrubbing puede filtrar datos de clientes. Alternativa de menor alcance: no instrumentar todavía y mantener logs Vercel.

### 14. Lighthouse / LHCI — VIGILAR (19/25)
- **[HECHO]** Lighthouse 13.5.0 activo (npm 2026-10-24); **@lhci/cli 0.15.1 sin actualización desde 2025-06-25** (npm, 2026-10-24) → el harness de CI está semiestancado.
- **[RECOMENDACIÓN]** No instalar lhci ahora; Speed Insights cubre CWV reales. Ejecutar `lighthouse` CLI ad-hoc sobre previews cuando se necesite un baseline de laboratorio.
- **Riesgo:** baselines de lab divergen de usuarios reales (CWV de campo es lo que posiciona Google).

### 15. promptfoo — EXPERIMENTAR (22/25)
- **[HECHO]** MIT, release 0.125.0 del 2026-10-23, push diario (GitHub API). El provider `openai` soporta `apiBaseUrl` para gateways OpenAI-compatibles con `apiKeyEnvar` (promptfoo.dev/docs/providers/openai, 2026-10-24) → compatible con el gateway IA multiproveedor del proyecto (`@ai-sdk/openai-compatible`, package.json).
- **[HIPÓTESIS]** Permite comparar proveedores/prompts con asserts deterministas (llm-rubric, javascript) y regresar costes por caso.
- **Riesgo:** los evals con LLM-juez tienen varianza; fijar seeds/temperatura y umbrales; no reportar métricas no ejecutadas.

### 16. evalite — EXPERIMENTAR (20/25)
- **[HECHO]** MIT (repo mattpocock/evalite), 1.722 estrellas; "Built on Vitest… Export your evals as static HTML bundles for CI/CD. Use score thresholds to fail the build" (evalite.dev, 2026-10-24). Última release 0.19.0 del 2025-11-06 y último push 2026-04-28 (GitHub API) → ritmo lento.
- **[HIPÓTESIS]** Encaja mejor que promptfoo para evals viviendo junto a los tests vitest existentes, pero la madurez es menor.
- **Riesgo:** proyecto joven de un mantenedor; verificar con la versión fijada y sin exposición de datos reales de clientes en los evals.

### 17. Langfuse — EXPERIMENTAR (18/25)
- **[HECHO]** Núcleo MIT ("MIT Expat" fuera de directorios `ee/` que son comerciales — LICENSE del repo, GitHub API 2026-10-24). 36.276 estrellas, push diario. La integración `@langfuse/vercel-ai-sdk` 6.0.2 **está orientada a AI SDK 7**; para **AI SDK v6** (el actual del proyecto: `ai` 6.0.208) la vía documentada es la heredada vía `experimental_telemetry` + OpenTelemetry (langfuse.com/integrations/frameworks/vercel-ai-sdk, 2026-10-24).
- **[RECOMENDACIÓN]** Experimentar en staging con llamadas del gateway: trazas, latencia y coste por proveedor. Decidir entre cloud (región UE) o self-host antes de producción; si los payloads contienen datos de clientes, aplicar la misma revisión de privacidad que Sentry.
- **Riesgo (crítico):** compatibilidad "legacy" hasta migrar a AI SDK 7, licencia dual (core MIT + ee comercial) y tercerización de trazas de IA. No adoptar en producción sin revisión de privacidad.

### 18. dependency-cruiser — EXPERIMENTAR (23/25)
- **[HECHO]** MIT, 18.7.0, npm 2026-10-23. Valida reglas sobre el grafo de dependencias (forbid/depend rules).
- **[HIPÓTESIS]** Útil para cristalizar dos reglas existentes del proyecto: frontera cliente/servidor de integraciones (`docs/INTEGRATIONS_ROADMAP.md`: "External secrets never reach browser code") y aislamiento del módulo Resumen protegido (nadie puede importar sus internos).
- **Riesgo:** mantenimiento de las reglas; empezar con 2–3 reglas de alto valor.

### 19. knip — ADOPTAR (25/25)
- **[HECHO]** **Ya en curso internamente** (PR #227, evidencia interna). ISC, 6.42.1, npm 2026-10-19, muy activo. No es una incorporación nueva de esta investigación: se ratifica la decisión interna existente.

### 20. Atlas — DESCARTAR (16/25)
- **[HECHO]** Herramienta de gestión de esquemas declarativa (ariga). El proyecto ya tiene pipeline maduro propio: 297 migraciones + recovery drill en CI + `verify:migrations` (evidencia interna).
- **[RECOMENDACIÓN]** DESCARTAR: duplicaría capacidad existente y suficiente (regla de no-duplicación) con coste migratorio alto.

### 21. API Banco Central de Chile — ADOPTAR (24/25)
- **[HECHO]** API **gratuita** de la Base de Datos Estadísticos (BDE): REST/SOAP/librería Python; requiere cuenta BDE + habilitar credenciales (token en "Mi Cuenta"); acceso "inmediato y gratuito", sin contratos (si3.bcentral.cl/estadisticas/Principal1/Web_Services/ayuda_soporte.html y …/index_API_sec1_es.htm, 2026-10-24). Series oficiales p. ej. UF `F073.UFF.PRE.Z.D`, UTM `F073.UTR.PRE.Z.M`, dólar observado.
- **[HIPÓTESIS]** Necesaria para módulos de finanzas/nómina: contratos en UF, UTM para remuneraciones, conversión de moneda con valor oficial.
- **Riesgo:** ninguno crítico; documentar términos de uso vigentes (PDF oficial de términos consultado 2026-10-24; el flujo actual es autoservicio por cuenta BDE).

### 22. Transbank Webpay Plus REST — EXPERIMENTAR (22/25)
- **[HECHO]** API REST oficial (SOAP deprecado, aviso oficial de migración en el portal). Ambiente de integración **gratuito con códigos de comercio predefinidos** (p. ej. Webpay Plus `59705555555532`) — transbankdevelopers.cl/documentacion/como_empezar (2026-10-24). SDK Node oficial `transbank-sdk` 6.1.1 (BSD-3-Clause; npm 2025-12-09; repo push 2026-09-28) — npm + GitHub API, 2026-10-24. Producción requiere afiliación comercial (costos no públicos; negocian con cada comercio).
- **[RECOMENDACIÓN]** Experimentar en sandbox tan pronto como el producto decida pagos locales; es el método dominante en Chile (tarjetas + Redcompra) y complementa a MercadoPago (ya documentado internamente en `docs/MERCADO_PAGO_SETUP.md`).
- **Riesgo:** costo comercial desconocido hasta la afiliación; webhook/commit flow debe diseñarse idempotente (patrón ya definido en FASE4 para DTE, reutilizable).

### 23. OpenFactura (Haulmer) — ADAPTAR (20/25)
- **[HECHO interno reutilizado]** La comparativa DTE ya está hecha (`docs/FASE4_Comparacion_Proveedores_DTE.md`): recomendación de pilotar OpenFactura (sandbox público sin cuenta, $19.900 CLP/año por empresa en kit básico, multi-RUT) con SimpleFactura/Tupana como respaldo. Esta investigación **no re-audita** esa decisión.
- **[RECOMENDACIÓN]** Antes de firmar: re-verificar precio/ToS vigentes contra haulmer.cl y confirmar el modelo multi-tenant por empresa.
- **Riesgo:** dependencia de un tercero para capacidad tributaria crítica (folio/CAF por empresa); mitigado por la arquitectura asíncrona con idempotencia ya especificada en FASE4.

### 24. SII directo — DESCARTAR (9/25)
- **[HECHO]** **No existe API pública oficial** del Portal MIPYME para terceros: el dominio `developers.sii.cl` no resuelve (NXDOMAIN, DNS 2026-10-24); el SII ofrece (a) el portal web gratuito de emisión manual (Guía oficial del Portal MIPYME, www1.sii.cl, 2026-10-24; chileatiende.gob.cl/fichas/13505, 2026-10-24), (b) el camino de "desarrollo propio o solución de mercado" con certificado digital vía XML/ambiente de certificación (sii.cl/servicios_online/1039-menu_certificacion-1184.html, 2026-10-24), y (c) documentación API solo para el registro de cesión de créditos (RPETC) en esa misma página. Wrappers comerciales confirman que "el SII no expone oficialmente vía servicios web" la funcionalidad del portal (apigateway.cl, fuente **tercera**, 2026-10-24).
- **[RECOMENDACIÓN]** DESCARTAR integración directa; la vía correcta es proveedor DTE certificado (§23). Esto **confirma** la premisa de FASE4 ("el portal gratuito no tiene API") ahora con fuentes oficiales.

### 25. ClaveÚnica — DESCARTAR (13/25)
- **[HECHO]** Uso "exclusivo para personas naturales" (Decreto 9/2023, leychile.cl, 2026-10-24) y reservado a plataformas del Estado o privadas **con habilitante normativo/convenio explícito** (Términos de integración de Gobierno Digital, wikiguias.digital.gob.cl, 2026-10-24; Hacienda: "AFP, AFC y Firma Electrónica" como ejemplos, hacienda.cl, 2026-10-24). Un SaaS privado como Nüva One no califica.
- **[RECOMENDACIÓN]** DESCARTAR; la autenticación sigue siendo Supabase Auth. Si algún cliente estatal futuro lo exigiera, revisar los criterios de la SGD en ese momento.

### 26. API Gateway / ApiPyme — VIGILAR (12/25)
- **[HECHO]** Servicios comerciales (privados) que envuelven el portal gratuito del SII con credenciales del contribuyente (RUT + clave tributaria) — apigateway.cl / apipyme.cl (2026-10-24). **No son oficiales**.
- **[RECOMENDACIÓN]** VIGILAR: la sync de compras/ventas (RCV) que ofrecen es atractiva para el módulo de gastos, pero delegar credenciales SII de los clientes a un tercero tiene riesgo de ToS/fragilidad y de confianza; si la necesidad surge, evaluar primero si el proveedor DTE elegido ya la entrega.

---

## Regla de oro de adopción

Ningún ADOPTAR de esta lista debe instalarse en producción por defecto: todos entran primero por la rama aislada correspondiente del `IMPLEMENTATION_ROADMAP.md`, con criterios de aceptación y reversión, respetando la regla de no-duplicación frente a lo ya instalado (npm audit, pgTAP, verify:migrations, agency workflows, skill supabase oficial).
