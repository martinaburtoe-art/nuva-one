# SKILLS_AND_TOOLS — Nüva One (2026-10-21)

Inventario de capacidades preparadas para la misión. Convención: instalada ≠ funcional — cada entrada indica su prueba real.

## 1. Skills de Hermes usadas en esta misión

| Skill | Procedencia | Función | Estado | Prueba ejecutada |
|---|---|---|---|---|
| hermes-agent | bundled (Nous Research) | Operación/CLI de Hermes, instalación de skills | CARGADA | `hermes skills --help`, `hermes --version`, installs reales |
| github | benbarclay/Hermes (bundled) | gh CLI: PRs, checks, API | CARGADA | `gh auth status`, `gh pr list`, `gh run list`, `gh api` |
| supabase | **oficial** github.com/supabase/agent-skills v0.1.2 (veredicto SAFE, hash escaneado) | Guías actuales de Supabase (Data API, RLS, CLI) | INSTALADA + probada carga | `hermes skills install ... --yes` OK; carga verificada en snapshot de sesión siguiente |
| bun-vite-build-troubleshooting | bundled | Diagnóstico del historial bun/esbuild de este repo | CARGADA | aplicada al diagnóstico del estado de node_modules |
| systematic-debugging / requesting-code-review / codebase-inspection | bundled | Próximas fases (fixes, revisión, LOC) | DISPONIBLES | — |
| dogfood, claude-design, popular-web-designs, blocked-page-recovery | bundled | QA exploratoria web + referencias de diseño para Fase Cuatro | DISPONIBLES | — |

## 2. Herramientas nativas verificadas

| Herramienta | Versión | Estado | Prueba |
|---|---|---|---|
| gh CLI | 2.x (GitHub CLI) | PASS | auth OK, repo/PRs/runs leídos |
| supabase CLI | 2.109.1 | PASS (instalada) / BLOCKED (gestión sin token) | `supabase --version`; gestión requiere SUPABASE_ACCESS_TOKEN |
| vercel CLI | 59.14.0 | BLOCKED (deslogueado) | `vercel whoami` → Logged out |
| Node/npm | 24.16.0 / 11.13.0 | PASS | builds/tests ejecutándose |
| Navegador automatizado (browser_exec) | integrado Hermes | PENDIENTE DE USO | se usará para verificación visual de /dashboard cuando exista sesión de prueba |
| curl + extracción de bundle | — | PASS | verificación de identidad Supabase y sondas REST |

## 3. Skills del catálogo evaluadas y descartadas (hoy)

| Candidata | Fuente | Decisión | Motivo |
|---|---|---|---|
| vercel-deploy | openai/skills (trusted) | DESCARTADA por ahora | CLI de Vercel deslogueado; sin valor hasta `vercel login` |
| supabase (variantes community) | skills-sh/mindrally, alinaqi | DESCARTADA | duplican la oficial ya instalada (menor procedencia) |
| Vercel / Vercel API | clawhub (community) | DESCARTADA | procedencia community sin verificar + CLI bloqueado |
| oss-forensics, 1password | oficial | DESCARTADA | no aplican al alcance actual (forense de supply chain / secretos 1P) |
| Búsquedas realizadas | postgres, owasp, playwright, design system, accessibility, lighthouse, react performance, saas, typescript | — | catálogo sondeado (8 búsquedas, log en cache); nada superó a lo ya disponible para esta fase |

## 4. Bloqueos de capacidades

1. **Vercel**: sin login no hay listado de deployments, variables por entorno, previews ni promoción. Acción requerida del usuario: `vercel login` (interactivo).
2. **Supabase gestión**: sin SUPABASE_ACCESS_TOKEN no hay `supabase db pull`, logs, ni verificación de RLS contra la BD real (solo sondeos REST anónimos + migraciones locales).
3. **UI autenticada**: no existe cuenta de prueba conocida para validar /dashboard tras login; pendiente definir estrategia (cuenta demo o credenciales de prueba del usuario).
