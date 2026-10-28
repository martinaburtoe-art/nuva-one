# IMPLEMENTATION_ROADMAP — Nüva One (2026-10-24)

Orden de incorporación del arsenal evaluado en `TECH_RADAR.md`. Todo se ejecuta en rama aislada, con PR independiente, sin push a `main`, sin fusiones ni despliegues sin autorización. Ninguna tarea toca el módulo Resumen protegido ni `src/resumen-premium.css`. Esfuerzo: **S** ≤1 día · **M** 2–4 días · **L** >1 semana.

## Dependencias y bloqueos previos (decisión del usuario)

| Bloqueo | Impacto | Acción requerida |
|---|---|---|
| Cuentas de prueba para login | Bloquea E2E autenticado (bloqueador de lanzamiento #4) y la skill regression-engineer | Definir cuenta demo o credenciales de prueba en GitHub Secrets/Vercel env |
| `SUPABASE_ACCESS_TOKEN` | Bloquea verificación de RLS/esquema contra la BD real | Aportar token (o aprobar el flujo solo-local) |
| Branch protection en `main` (SEC-02) | Riesgo de push directo | Activar protección en GitHub (acción del propietario) |
| Decisión de producto pagos/DTE | Bloquea Transbank sandbox y OpenFactura | Decisión comercial |

---

## Ola 1 — Seguridad y quick wins de bajo riesgo (paralelizables)

| # | Ítem | Decisión radar | Esf. | Riesgo | Criterios de aceptación |
|---|---|---|---|---|---|
| 1 | **Zizmor** como job de CI (primero informativo; bloqueante solo tras inventariar base) | ADOPTAR | S | Bajo | Job corre sobre todos los workflows; informe distingue hallazgos base vs nuevos; 0 hallazgos críticos sin triage documentado |
| 2 | **Gitleaks** Action en cada PR | ADOPTAR | S | Bajo | Bloquea un token de prueba en rama aislada; allowlists solo documentadas |
| 3 | **Squawk** sobre migraciones nuevas del PR | ADOPTAR | S | Bajo | Falla ante `CREATE INDEX` sin `CONCURRENTLY` de prueba; migraciones históricas excluidas por config |
| 4 | **Vercel Speed Insights** (habilitar en dashboard) | ADOPTAR | S | Bajo | Datos RUM visibles tras 24–48h de tráfico real; sin cambios de código |
| 5 | **fast-check**: 2–3 propiedades sobre aritmética monetaria de ventas | ADOPTAR | S | Bajo | Propiedades verdes en CI; al menos 1 contraejemplo minimizado demostrado en el PR |
| 6 | **`supabase gen types`** + check de CI de sincronización | ADOPTAR | S | Bajo | CI falla si tipos commiteados difieren del esquema migrado localmente |

## Ola 2 — Capacidad de testing (cierra el bloqueador #4)

| # | Ítem | Decisión radar | Esf. | Riesgo | Criterios de aceptación |
|---|---|---|---|---|---|
| 7 | **Playwright** + setup auth (`storageState`, `.auth` en gitignore) | ADOPTAR | M | Medio (env de baselines) | 1 flujo crítico de ventas E2E verde en CI; estados de auth jamás commiteados; snapshots EXCLUYEN el módulo Resumen |
| 8 | **Skill `nuva-supabase-guardian`** (construir; instala tras auditar) | CONSTRUIR | M | Bajo | Skill descubrible por Hermes; ejecuta su procedimiento sobre un PR real de migración con informe PASS/FAIL por tabla |
| 9 | **Skill `nuva-ci-diagnostics`** (sobre gh-fix-ci adaptado) | CONSTRUIR/ADAPTAR | S–M | Bajo | Diagnostica un check roto de ejemplo; clasifica base vs nueva con evidencia; respeta baseline de lint (56 errores actuales) |
| 10 | Hardening RLS de las 3 tablas de People sin endurecer (evidencia interna) usando patrones Basejump (ADAPTAR) en suite pgTAP | ADAPTAR | M | Medio | Tests de aislamiento multi-usuario por tabla; suite pgTAP verde en CI |

## Ola 3 — IA con evidencia y observabilidad

| # | Ítem | Decisión radar | Esf. | Riesgo | Criterios de aceptación |
|---|---|---|---|---|---|
| 11 | Piloto **promptfoo** (5–10 casos, 2 proveedores, umbral) — elegir UNO con evalite | EXPERIMENTAR | M | Medio | Informe de eval con coste por caso/proveedor; varianza documentada; sin datos reales de clientes |
| 12 | Piloto **evalite** en paralelo (si se prefiere vivir en vitest) | EXPERIMENTAR | S | Medio | Evals exportadas con umbral que falla el build en CI de forma controlada |
| 13 | **Langfuse** en staging vía AI SDK v6 legacy (`experimental_telemetry`) con datos sintéticos | EXPERIMENTAR | M | Medio (privacidad) | Trazas visibles con coste/latencia por llamada; revisión de privacidad hecha ANTES de cualquier dato real |
| 14 | **Sentry** con revisión de privacidad previa (scrubbing, `sendDefaultPii:false`) | ADOPTAR | S | Medio (privacidad) | Error de prueba capturado en preview; auditoría del payload sin PII; reversión documentada (quitar DSN) |
| 15 | **Skill `nuva-ai-evaluator`** (orquesta el ganador del piloto) | CONSTRUIR | M | Bajo | Suite de evals reproducible + informe de costes/calidad con evidencia |

## Ola 4 — Arquitectura e integraciones locales

| # | Ítem | Decisión radar | Esf. | Riesgo | Criterios de aceptación |
|---|---|---|---|---|---|
| 16 | **dependency-cruiser**: 2 reglas (secrets fuera de código de navegador; internos del módulo Resumen no importables) | EXPERIMENTAR | S | Bajo | Las 2 reglas corren en CI como warning la 1ª semana; violaciones de ejemplo detectadas |
| 17 | **OSV-Scanner** job agendado no bloqueante | EXPERIMENTAR | S | Bajo | 2–3 corridas; decisión documentada de continuar o cerrar (no duplicar `npm audit`) |
| 18 | **API Banco Central** (UF/UTM/USD): función server-side + tabla cache (token fuera del navegador) | ADOPTAR | M | Bajo | UF/UTM oficiales cacheadas; fallback al valor anterior si BCCh cae; token solo en env server |
| 19 | **Transbank Webpay Plus** sandbox (si hay decisión de producto) | EXPERIMENTAR | M | Medio | create→redirect→commit idempotente en sandbox; claves de integración oficiales; sin afiliación |
| 20 | Skills restantes: `nuva-migration-validator` (M), `nuva-release-verifier` (S–M), `nuva-regression-engineer` (M, tras #7), `nuva-privacy-guardian` (S–M), `nuva-chile-integrations` (condicionada a #19/DTE) | CONSTRUIR | M c/u | Bajo | Cada skill descubrible por Hermes + 1 ejecución real de prueba + reversión documentada |
| 21 | Piloto **OpenFactura** sandbox (si hay decisión DTE) | ADAPTAR | L | Alto (tributario) | Solo sandbox: emitir DTE de prueba; nunca a producción sin autorización expresa |

## Qué NO hacer (decisiones negativas activas)

- **DESCARTAR:** SII directo (sin API pública oficial — TECH_RADAR #24), ClaveÚnica (habilitante normativo imposible hoy), Atlas (duplica pipeline propio), variantes community de skills supabase/postgres.
- **VIGILAR sin instalar:** MSW, Lighthouse/LHCI como gate, Scorecard, Betterleaks, wrappers comerciales del SII (apigateway/apipyme), stripe-projects y page-agent (skills del hub).
- **Sin excepciones:** ninguna herramienta nueva entra a producción sin pasar su ola, PR y criterios de aceptación; ninguna puntuación alta justifica saltarse la revisión de privacidad (Sentry/Langfuse) o de licencia (Langfuse ee).

## Regla de continuidad

Si la sesión se interrumpe: retomar desde la última ola con estado verificado (PRs mergeados o abiertos), no desde suposiciones. Este roadmap + `TECH_RADAR.md` + `SOURCE_REGISTER.md` constituyen el estado persistido de la investigación.
