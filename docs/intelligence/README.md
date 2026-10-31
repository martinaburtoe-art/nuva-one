# Nüva One — Biblioteca de Inteligencia Tecnológica (`docs/intelligence/`)

**Fecha de elaboración:** 2026-10-24 · **Autor:** Hermes Agent (misión ARSENAL, fase de investigación externa)
**Alcance:** SOLO investigación y documentación. Nada de lo aquí listado fue instalado, aplicado o fusionado en esta fase. Ningún archivo de `src/`, migraciones, PRs ni configuración fue modificado.

---

## 1. Objetivo

Descubrir, verificar con **fuentes primarias** y clasificar las capacidades externas (herramientas, repositorios, skills) que pueden llevar Nüva One al siguiente nivel, con decisiones explícitas del radar tecnológico. Este documento NO reaudita el proyecto: reutiliza la evidencia interna existente en `docs/audit/` (12+ informes), `docs/release/NUVA_ONE_LAUNCH_READINESS.md` y `docs/admin/` como línea base verificada.

## 2. Índice

| Archivo | Contenido |
|---|---|
| `TECH_RADAR.md` | Todos los candidatos con matriz de puntuación (0-5), decisión del radar y riesgos separados |
| `TOOLS_CATALOG.md` | Herramientas seleccionadas: qué resuelven, licencia, versión verificada, coste, cómo probarlas |
| `REPOSITORIES_CATALOG.md` | Repositorios analizados con licencia, actividad real y oportunidades de reutilización |
| `SKILLS_CATALOG.md` | Skills del hub evaluadas + las 8 skills propias Nüva propuestas, con decisión para cada una |
| `SOURCE_REGISTER.md` | Cada URL consultada, qué afirmación respalda, fecha de consulta y vigencia |
| `IMPLEMENTATION_ROADMAP.md` | Prioridades ordenadas con dependencias, esfuerzo y criterios de aceptación |

Documentos complementarios pendientes (no cubiertos por esta fase de investigación): `ARCHITECTURE_MAP.md`, `SECURITY_PLAYBOOK.md`, `SUPABASE_POSTGRES_PLAYBOOK.md`, `QA_REGRESSION_PLAYBOOK.md`, `AI_ENGINEERING_PLAYBOOK.md`, `CHILE_INTEGRATIONS.md`, `COMPETITIVE_ADVANTAGES.md`. La evidencia interna para alimentarlos ya existe en `docs/audit/`.

## 3. Reglas de esta biblioteca

1. **Fuentes primarias obligatorias.** Toda afirmación técnica sobre un candidato cita su fuente oficial (repo original, documentación oficial, registro npm, API de GitHub, advisories) con URL y fecha de consulta. Ver `SOURCE_REGISTER.md`.
2. **Clasificación de afirmaciones.** Cada afirmación se marca:
   - **[HECHO]** comprobado con evidencia (tool output verificable, URL oficial consultada).
   - **[HIPÓTESIS]** beneficio esperado, pendiente de prueba en el proyecto.
   - **[RECOMENDACIÓN]** juicio del evaluador basado en hechos + contexto del proyecto.
3. **Matriz de evaluación (0-5 por dimensión):**
   - **Valor** — cuánto resuelve un problema real y priorizado de Nüva One.
   - **Compatibilidad** — encaje con el stack real (React 19.2 + TS 5.6 + Vite 8 + TanStack Start + Tailwind 4 + Supabase/PostgreSQL/RLS/pgTAP + GitHub Actions + Vercel + AI SDK 6 multi-proveedor).
   - **Madurez** — releases, actividad, adopción, estabilidad documentada.
   - **Mantenibilidad** — coste de mantener la integración, de actualizar y de revertir.
   - **Seguridad** — superficie de ataque, permisos solicitados, procedencia, tratamiento de secretos.
   - **Regla crítica:** una puntuación total alta NUNCA compensa una vulnerabilidad grave o una licencia incompatible; los riesgos se documentan por separado en cada entrada.
4. **Radar (decisiones):** ADOPTAR · ADAPTAR · CONSTRUIR · EXPERIMENTAR · VIGILAR · DESCARTAR. Definiciones en `TECH_RADAR.md`.
5. **Sin duplicación.** Un candidato que duplica una capacidad ya instalada y suficiente se DESCARTA o VIGILA con el motivo explícito (p. ej. `npm audit` ya corre en CI ⇒ osv-scanner es VIGILAR; skill `supabase` oficial ya instalada ⇒ variantes community DESCARTADAS).
6. **Sin métricas inventadas.** No hay benchmarks ni resultados de pruebas no ejecutadas. Los estados siguen la convención PASS/FAIL/WARN/BLOCKED/UNKNOWN del proyecto.
7. **Restricción permanente.** El módulo Resumen del dashboard y `src/resumen-premium.css` (PR #230) están PROTEGIDOS: ninguna recomendación aquí propone tocarlos; la regresión visual propuesta los EXCLUYE explícitamente.
8. **Privacidad.** Ningún token, credencial, dato de cliente ni información privada aparece en esta biblioteca.

## 4. Línea base interna reutilizada (no reauditoría)

Evidencia clave reutilizada de `docs/audit/` y `docs/release/` (verificada 2026-10-22):

- **PASS:** build de producción, typecheck 0 errores, 308/308 tests vitest, `npm audit` 0 vulns, suite pgTAP (50 archivos, 61+ aserciones) en CI con base efímera + recovery drill sobre 297 migraciones, RLS habilitada en todas las tablas públicas (invariant `999_security_invariants.sql`).
- **Gaps reales que justifican candidatos:** SEC-02 (main sin branch protection), SEC-03 (sin CSP), bloqueador de lanzamiento #4 (E2E autenticado BLOCKED por cuentas de prueba), DRIFT-01 (RPCs `people_dashboard_summary`/`finance_dashboard_summary` invocados y ausentes de migraciones), CWV/Lighthouse UNKNOWN, People: 3 tablas sin endurecer, lint con 56 errores react-hooks v7, LINT-01, DEP-01 (recharts vs React 19), DEP-02 (doble lockfile).
- **Ya en curso internamente:** PR #227 (knip dependency audit), workflows agency (ci-repair, sentinel, web-qa, safe-merge), `nuva-ai-gateway-live-certification.yml`, `factory:release-evidence`, `verify:migrations`.

## 5. Cómo usar esta biblioteca

1. Para decidir una incorporación: partir de la entrada en `TECH_RADAR.md`, verificar sus riesgos, luego los detalles en el catálogo correspondiente.
2. Para ejecutar: seguir `IMPLEMENTATION_ROADMAP.md` (orden por dependencias y criterios de aceptación verificables).
3. Antes de instalar cualquier cosa nueva: releer la regla de no-duplicación (§3.5) y los estados BLOCKED (cuentas de prueba, tokens) documentados en el roadmap.
4. Toda cita externa debe poder re-verificarse contra `SOURCE_REGISTER.md`.

## 6. Resultados de esta fase (2026-10-24) — los 6 archivos están completos

**Decisión por área** (detalle en `TECH_RADAR.md`):
- **ADOPTAR:** fast-check, Playwright, Squawk, Zizmor, Gitleaks, Vercel Speed Insights, Sentry (con revisión de privacidad previa), `supabase gen types`, knip (ya en curso), API Banco Central (gratuita, cuenta BDE + token).
- **ADAPTAR:** patrones de pruebas RLS de Basejump (repo inactivo, no adoptar el código), OpenFactura según FASE4, web-vitals si se necesita RUM propio.
- **EXPERIMENTAR:** promptfoo, evalite (elegir UNO), Langfuse (AI SDK v6 vía legacy OTel; privacidad primero), OSV-Scanner (no bloqueante), dependency-cruiser, Transbank Webpay sandbox.
- **VIGILAR:** MSW, Lighthouse/LHCI como gate, Scorecard, Betterleaks, wrappers comerciales del SII, skills del hub stripe-projects/page-agent.
- **DESCARTAR (hallazgos negativos con fuente oficial):** integración directa con SII (no existe API pública oficial del Portal MIPYME; `developers.sii.cl` es NXDOMAIN), ClaveÚnica (solo Estado o privadas con habilitante normativo — Decreto 9/2023 y Términos SGD), Atlas (duplica pipeline propio), variantes community de skills.
- **CONSTRUIR:** las 8 skills Nüva quedan justificadas — el hub no tiene skills oficiales/trusted para RLS, migraciones, evals IA, observabilidad ni Chile (ver `SKILLS_CATALOG.md`).

**Próximo paso ejecutable:** Ola 1 del `IMPLEMENTATION_ROADMAP.md` (Zizmor, Gitleaks, Squawk, Speed Insights, fast-check, gen types) — todo S de esfuerzo, en rama aislada, sin tocar el módulo Resumen protegido.
