# SKILLS_CATALOG — Nüva One (2026-10-24)

Evalúa (1) skills del Hermes Skills Hub candidatas a instalar y (2) las 8 skills propias Nüva propuestas en la misión (§9). **Nada fue instalado en esta fase**; cada entrada deja lista la decisión y el procedimiento para la fase de incorporación.

Evidencia de sondeo del hub: 22 búsquedas (`hermes skills search`, 2026-10-24): supabase, postgres, testing, security, property testing, saas, multi-tenant, ai evaluation, observability, chile, migration, accessibility, performance, rls, vitest, playwright, llm eval, tenant, release verification, prompt engineering, github actions, typescript.

---

## 1. Skills del hub — evaluación

### 1.1 Recomendadas (instalables cuando se autorice)

| Skill | Procedencia/Trust | Decisión | Motivo |
|---|---|---|---|
| `gh-fix-ci` (openai/skills, vía skills.sh) | **trusted** | **ADAPTAR** | Procedimiento correcto y verificable: usa `gh` para inspeccionar checks/logs, resume el fallo, propone plan y **solo implementa tras aprobación explícita** (SKILL.md inspeccionado con `hermes skills inspect`, 2026-10-24). Es la base natural de `nuva-ci-diagnostics`; Nüva aporta el contexto propio (workflows agency, baseline de lint 56 errores, regla "no ocultar errores base"). |
| `playwright` (openai/skills) | **trusted** | **EXPERIMENTAR** | Acompaña la adopción de Playwright (TECH_RADAR #2) con patrones de automatización real de navegador. Instalar junto con el paquete, no antes. |
| `stripe-projects` (official/payments) | official | **VIGILAR** | El repo ya depende de `stripe` ^22.3.0 (package.json). Interesante si se activan pagos con Stripe; sin decisión de producto, no instalar. |
| `page-agent` (official/web-development) | official | **VIGILAR** | Copiloto QA embebido en la web (dogfood de flujos reales en previews). Evaluar tras el E2E autenticado (necesita cuentas de prueba). |
| `adversarial-user-test` (browse-sh) | community | **VIGILAR** | Idea valiosa (usuario hostil que tria puntos de dolor UX) pero procedencia community sin auditar; revisar su contenido antes de cualquier uso. |

### 1.2 Descartadas (con motivo)

| Skill/candidata | Fuente | Decisión | Motivo |
|---|---|---|---|
| Variantes `supabase` (skills-sh/mindrally, skills-sh/alinaqi, clawhub supabase-api, oo-supabase) | community | **DESCARTAR** | Duplican la skill oficial `supabase` v0.1.2 **ya instalada y validada** (docs/audit/SKILLS_AND_TOOLS.md, 2026-10-21). Regla de no-duplicación. |
| Variantes `postgres` (timescale/pg-aiguide, sanjay3290/ai-skills, databases/postgres-best-practices) | community | **DESCARTAR** | Contenido genérico sin verificación; el dominio real está en la skill oficial de Supabase + playbooks propios pendientes. |
| `llm-eval-harness`, `ai-eval-toolkit` | clawhub/community | **DESCARTAR** | Capacidades que promptfoo/evalite (EXPERIMENTAR) entregan con mejor mantenimiento; procedencia community sin auditar. |
| `observability` (varias), `yuyonghao-observability` | community | **DESCARTAR** | Genéricas; la observabilidad aquí se decide con Sentry/Langfuse/Speed Insights (TECH_RADAR). |
| `ecto-migrator`, `phy-openclaw-multibot-audit`, `Chinese Talent Scout`, skills de viajes/café/SeatGuru | community | **DESCARTAR** | No aplican al stack/ámbito (Elixir, other audits, irrelevantes). |
| `vitest` (antfu y otras variantes) | community | **DESCARTAR** | El equipo ya domina vitest (308/308 tests — evidencia interna); una skill genérica añade poco. |

### 1.3 Conclusión del sondeo

**[HECHO]** El hub no ofrece skills oficiales/trusted de calidad para: pruebas RLS/multi-tenant, migraciones Postgres, evals de IA con AI SDK, observabilidad JS ni integraciones chilenas. Las community que rozan estos temas carecen de procedencia auditable. Esto **justifica CONSTRUIR** las skills propias en lugar de instalar genéricas.

---

## 2. Las 8 skills propias Nüva — evaluación y decisión

Criterio de priorización: brecha real cubierta + riesgo que mitiga + solapamiento con capacidades existentes (workflows agency, scripts `verify:*`, suite pgTAP). Matriz: valor esperado (V), compatibilidad con Hermes actual (C), mantenibilidad prevista de la skill (Mt), seguridad del procedimiento (S); M no aplica hasta construirla.

| Skill | V | C | Mt | S | Decisión | Prioridad |
|---|---|---|---|---|---|---|
| nuva-supabase-guardian | 5 | 5 | 4 | 5 | **CONSTRUIR** | P1 |
| nuva-ci-diagnostics | 5 | 5 | 4 | 5 | **CONSTRUIR** (base: gh-fix-ci ADAPTADO) | P1 |
| nuva-migration-validator | 4 | 5 | 4 | 5 | **CONSTRUIR** (alcance delimitado) | P2 |
| nuva-ai-evaluator | 5 | 5 | 4 | 5 | **CONSTRUIR** | P2 |
| nuva-release-verifier | 4 | 5 | 4 | 5 | **CONSTRUIR** (orquestador delgado) | P2 |
| nuva-regression-engineer | 4 | 4 | 3 | 5 | **CONSTRUIR** (depende de Playwright) | P3 |
| nuva-privacy-guardian | 4 | 4 | 4 | 5 | **CONSTRUIR** | P3 |
| nuva-chile-integrations | 3 | 4 | 4 | 5 | **CONSTRUIR** (condicionada a decisión DTE/pagos) | P3 |

**Ninguna se DESCARTA**, pero se re-delimitan para evitar solapamientos: migration-validator no re-implementa `verify:migrations` (lo invoca); release-verifier no re-implementa `factory:release-evidence` (lo orquesta y audita); ci-diagnostics no sustituye workflows agency (los diagnostica).

### 2.1 `nuva-supabase-guardian` (P1)
- **Objetivo/límites:** revisar RLS, políticas, funciones `SECURITY DEFINER`, roles y aislamiento multi-empresa sobre las migraciones y el esquema real. Solo lectura y pruebas en entorno aislado.
- **Activación:** cambios en migraciones, tablas de People/finanzas, o revisiones de seguridad periódicas.
- **Procedimiento (resumen):** 1) inventariar tablas nuevas/modificadas del diff; 2) verificar RLS + policies por tabla; 3) revisar SECURITY DEFINER y grants; 4) ejecutar suite pgTAP de aislamiento; 5) reporte con evidencia por tabla.
- **Herramientas permitidas:** lectura de `supabase/migrations/`, supabase CLI (local), pgTAP, terminal. **Restricciones:** jamás contra producción; sin tokens de gestión sin autorización.
- **Criterios de aceptación:** 100% de tablas públicas del diff con RLS verificada + al menos 1 test de aislamiento por tabla nueva + cero SECURITY DEFINER sin revisión explícita.
- **Evidencia:** informe con comando, salida y veredicto PASS/FAIL/WARN por tabla.
- **Parada:** si se requiere SUPABASE_ACCESS_TOKEN o tocar producción → BLOCKED y pedir autorización.

### 2.2 `nuva-ci-diagnostics` (P1)
- **Objetivo/límites:** diagnosticar fallos reales de CI, distinguir regresiones nuevas de problemas de base (lint con 56 errores react-hooks v7 — evidencia interna) y proponer fixes sin ocultar errores.
- **Base:** ADAPTAR `gh-fix-ci` (trusted) + contexto Nüva.
- **Procedimiento:** 1) `gh run view`/logs del fallo; 2) reproducir localmente el subconjunto mínimo; 3) clasificar base vs nueva con el baseline documentado; 4) plan de fix; 5) implementar solo tras aprobación.
- **Restricciones:** no desactivar reglas; no marcar PASS sin ejecución.
- **Aceptación:** clasificación base/nueva con evidencia + fix verificado por re-run del check afectado.

### 2.3 `nuva-migration-validator` (P2)
- **Objetivo/límites:** detectar migraciones incompatibles (locks, no-concurrent index, tipos destructivos) y regresiones de esquema ANTES de aplicar; nunca aplicar a producción.
- **Procedimiento:** squawk sobre migraciones nuevas + `verify:migrations` existente + recovery drill efímero + diff de esquema (antes/después) con `supabase db dump` local.
- **Aceptación:** 0 hallazgos críticos de squawk sin justificar; recovery drill PASS sobre el set completo.
- **Nota:** Squawk (ADOPTAR) hace el trabajo estático; la skill encapsula el flujo completo con criterios del proyecto.

### 2.4 `nuva-ai-evaluator` (P2)
- **Objetivo/límites:** medir calidad de respuestas del gateway IA, detectar alucinaciones en casos definidos, registrar coste por proveedor y comparar. Solo en staging/con datos sintéticos.
- **Procedimiento:** set de casos dorados por flujo → correr promptfoo (o evalite, según el piloto) → registrar score+coste → comparar proveedores → informe.
- **Restricciones:** sin datos reales de clientes en prompts; claves por env vars; resultados como artefactos de CI.
- **Aceptación:** suite de evals ejecutada con umbrales; informe con coste por caso y proveedor.

### 2.5 `nuva-release-verifier` (P2)
- **Objetivo/límites:** producir el informe de lanzamiento con comprobaciones reproducibles, orquestando los scripts existentes (`factory:release-evidence`, `verify:*`, typecheck/lint/test).
- **Procedimiento:** ejecutar la batería → consolidar evidencias → lista de riesgos y bloqueos (estados PASS/FAIL/WARN/BLOCKED/UNKNOWN) → go/no-go recomendado.
- **Aceptación:** informe completo donde cada estado tiene comando+salida referenciada; sin estados inventados.

### 2.6 `nuva-regression-engineer` (P3, tras Playwright)
- **Objetivo/límites:** generar y mantener pruebas de regresión de flujos críticos (ventas, inventario, finanzas, People, permisos) con Playwright; **excluye el módulo Resumen protegido** de cualquier prueba visual que decida su estética.
- **Aceptación:** cada flujo crítico con al menos un test E2E autenticado; suite verde en CI; snapshots fuera del módulo protegido.

### 2.7 `nuva-privacy-guardian` (P3)
- **Objetivo/límites:** revisar telemetría, logs, datos personales y exposición accidental antes de activar terceros (Sentry, Langfuse, analytics) y en revisiones periódicas.
- **Aceptación:** sin PII en payloads hacia terceros (muestra auditada); documentación de privacidad actualizada; hallazgos con evidencia.

### 2.8 `nuva-chile-integrations` (P3, condicionada)
- **Objetivo/límites:** evaluar integraciones chilenas SOLO con fuentes oficiales, autenticación apropiada, límites de uso y pruebas aisladas (DTE/OpenFactura, Webpay, BCCh).
- **Condición de arranque:** decisión de producto sobre DTE/pagos locales. La base documental ya está en `TOOLS_CATALOG.md` §F y `SOURCE_REGISTER.md`.
- **Aceptación:** cada integración con requisitos/costos/disponibilidad verificados contra fuente oficial con fecha.

---

## 3. Qué instalar primero (recomendación para la fase de incorporación)

1. `gh-fix-ci` (trusted) como base inmediata de trabajo de CI + construir `nuva-ci-diagnostics` encima.
2. Construir `nuva-supabase-guardian` (gap de mayor riesgo: RLS/People/DRIFT-01).
3. El resto según `IMPLEMENTATION_ROADMAP.md`. Toda instalación de skills debe seguir las reglas de la misión §7 (procedencia verificada, contenido auditado, versión fijada, prueba funcional y reversión documentada).
