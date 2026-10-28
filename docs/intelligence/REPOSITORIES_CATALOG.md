# REPOSITORIES_CATALOG — Nüva One (2026-10-24)

Repositorios analizados con licencia, actividad real (GitHub API + registro npm, consultados 2026-10-24) y oportunidades de reutilización. Criterio: pocos por área, examinados contra releases/actividad/licencia/superficie de ataque, no solo estrellas. Ninguno fue instalado en esta fase.

## Tabla maestra

| Repo | Licencia | Estrellas | Último push | Última release | Decisión |
|---|---|---|---|---|---|
| [dubzzz/fast-check](https://github.com/dubzzz/fast-check) | MIT | 5.212 | 2026-10-24 | v4.10.2 (2026-09-19) | ADOPTAR |
| [microsoft/playwright](https://github.com/microsoft/playwright) | Apache-2.0 | 98.390 | 2026-10-24 | v1.64.1 (2026-10-14) | ADOPTAR |
| [sbdchd/squawk](https://github.com/sbdchd/squawk) | Apache-2.0/MIT | 1.229 | 2026-10-24 | v2.70.0 (2026-10-15) | ADOPTAR |
| [woodruffw/zizmor](https://github.com/woodruffw/zizmor) | MIT | 6.766 | 2026-10-23 | v1.31.1 (2026-10-15) | ADOPTAR |
| [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) | MIT | 30.280 | 2026-10-23 | v8.30.1 (2026-03-21) | ADOPTAR (con nota) |
| [google/osv-scanner](https://github.com/google/osv-scanner) | Apache-2.0 | 11.255 | 2026-10-23 | v2.7.0 (2026-10-12) | EXPERIMENTAR |
| [ossf/scorecard](https://github.com/ossf/scorecard) | Apache-2.0 | 5.784 | 2026-10-24 | v5.6.0 (2026-10-12) | VIGILAR |
| [langfuse/langfuse](https://github.com/langfuse/langfuse) | MIT core + `ee/` comercial | 36.276 | 2026-10-24 | v4.69.0 (2026-10-23) | EXPERIMENTAR |
| [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo) | MIT | 26.358 | 2026-10-24 | 0.125.0 (2026-10-23) | EXPERIMENTAR |
| [mattpocock/evalite](https://github.com/mattpocock/evalite) | MIT | 1.722 | 2026-04-28 | 0.19.0 (2025-11-06) | EXPERIMENTAR |
| [getsentry/sentry-javascript](https://github.com/getsentry/sentry-javascript) | MIT | 8.766 | 2026-10-23 | 11.9.0 (2026-10-23) | ADOPTAR (SDK) |
| [sverweij/dependency-cruiser](https://github.com/sverweij/dependency-cruiser) | MIT | 7.324 | 2026-10-23 | 18.7.0 (npm 2026-10-23) | EXPERIMENTAR |
| [GoogleChrome/lighthouse](https://github.com/GoogleChrome/lighthouse) | Apache-2.0 | 30.930 | 2026-10-24 | v13.5.0 (2026-09-18) | VIGILAR (solo CLI ad-hoc) |
| [usebasejump/supabase-test-helpers](https://github.com/usebasejump/supabase-test-helpers) | MIT | 132 | 2024-05-15 | — (sin releases; sin paquete npm: 404 en registry 2026-10-24) | ADAPTAR (solo patrones) |
| [TransbankDevelopers/transbank-sdk-nodejs](https://github.com/TransbankDevelopers/transbank-sdk-nodejs) | BSD-3-Clause | 55 | 2026-09-28 | 6.1.1 (2025-12-09) | EXPERIMENTAR (Webpay) |
| [supabase/agent-skills](https://github.com/supabase/agent-skills) | (skill oficial) | — | — | skill `supabase` v0.1.2 instalada y validada internamente (2026-10-21) | YA INSTALADA (reuso) |
| [openai/skills](https://github.com/openai/skills) | (repo de skills "trusted") | — | — | gh-fix-ci, playwright (consultadas vía Hermes Skills Hub, 2026-10-24) | ADAPTAR gh-fix-ci |

## Notas por repositorio

- **fast-check** — Reuso directo como devDependency; sin código que copiar. Actividad diaria y docs con ejemplos por runner (vitest incluido). Superficie de ataque mínima (librería de tests).
- **playwright** — Reuso de patrones oficiales: `tests/auth.setup.ts` con `storageState`, `.auth` ignorado, y snapshots visuales con umbral `maxDiffPixels`. Solo se consumen docs y paquete npm; nada se copia del repo.
- **squawk** — Reuso: CLI npm `squawk-cli`, GitHub Action `sbdchd/squawk-action`, config `.squawk.toml` (exclusiones documentadas). Binario Rust de release; sin dependencias JS.
- **zizmor** — Reuso: binario de release o contenedor; reglas documentadas por hallazgo con ejemplos before/after y auto-fixes. Autor maintainer de RustSec/PyPI — buena procedencia.
- **gitleaks** — Reuso: Action oficial `gitleaks/gitleaks-action` y hooks pre-commit. Nota [HECHO]: el README declara "feature complete" y anuncia sucesor (Betterleaks); los releases siguen siendo parches de seguridad. Licencia MIT sin restricción.
- **osv-scanner** — Reuso: CLI en un job agendado no bloqueante (npm audit ya es el gate). Docs oficiales en google.github.io/osv-scanner.
- **scorecard** — Reuso: solo ejecución periódica/manual para autoevaluar postura (SEC-02 branch protection, fijado de acciones). No se integra al CI.
- **langfuse** — Reuso: paquetes npm (`@langfuse/client`, `@langfuse/otel`, `@langfuse/vercel-ai-sdk` 6.0.2 para AI SDK 7) o self-host (Docker) si la privacidad lo exige. **Licencia dual [HECHO]:** MIT Expat para el core, comercial para `ee/` (LICENSE del repo). Evaluar self-host con datos reales de clientes solo con decisión explícita.
- **promptfoo** — Reuso: CLI con config YAML; ejemplos oficiales para gateways OpenAI-compatibles (`apiBaseUrl`). MIT.
- **evalite** — Reuso: evals `.eval.ts` sobre la infraestructura vitest existente. Ritmo lento (release 2025-11-06, push 2026-04-28) → fijar versión en el piloto.
- **sentry-javascript** — Reuso: `@sentry/react` 11.9.0 (SDK MIT; la plataforma SaaS es aparte). Condiciones de privacidad en TOOLS_CATALOG C2.
- **dependency-cruiser** — Reuso: reglas `forbidden`/`reachable` para fronteras (secrets no-browsers, internos del módulo Resumen). MIT, muy activo.
- **lighthouse** — Reuso: CLI para baselines de laboratorio; @lhci/cli semiestancado (npm 2025-06-25) → no como gate de CI.
- **supabase-test-helpers (Basejump)** — Reuso de **ideas** (patrones de pruebas de aislamiento RLS multi-usuario) hacia la suite pgTAP propia. No adoptar el repo: inactivo 18 meses, sin releases ni paquete npm. Verificación: GitHub API + registry npm (2026-10-24).
- **transbank-sdk-nodejs** — Reuso: SDK oficial de Transbank para Webpay Plus REST (create/commit/status/refund/capture), ambiente de integración con códigos predefinidos. BSD-3-Clause. Actividad moderada (rel 2025-12-09; push 2026-09-28). Solo vía server-side (nunca exponer clave de comercio al navegador).
- **supabase/agent-skills** — [HECHO interno] La skill oficial `supabase` v0.1.2 ya está instalada en Hermes con veredicto SAFE (docs/audit/SKILLS_AND_TOOLS.md, 2026-10-21). Reuso directo; no instalar variantes community que la duplican.
- **openai/skills** — Fuente "trusted" del hub: `gh-fix-ci` (diagnóstico de checks de PR con gh + plan antes de tocar código) es la mejor base para `nuva-ci-diagnostics`; `playwright` acompañará la adopción de Playwright. Ambas se inspeccionaron vía `hermes skills inspect/search` (2026-10-24); su instalación queda para la fase de incorporación.

## Criterios aplicados

1. **Licencias:** todas compatibles con uso comercial en SaaS propietario (MIT/Apache-2.0/BSD-3/ISC); Langfuse con excepción dual documentada (core MIT, `ee/` comercial — no se necesita la parte comercial para el piloto).
2. **Actividad:** todos los ADOPTAR/EXPERIMENTAR tienen releases ≤ 6 meses, excepto evalite (12 meses, compensado por encaje perfecto con vitest → por eso es EXPERIMENTAR, no ADOPTAR) y gitleaks (política "feature complete" pero parches de seguridad activos).
3. **Superficie de ataque:** consumidas como paquetes npm oficiales, binarios de release firmados o Actions oficiales; ninguna requiere curl|bash remoto ni permisos globales.
4. **No-duplicación:** descartadas las variantes community de skills de supabase/postgres (ya instalada la oficial — evidencia interna) y Atlas (pipeline propio maduro).
