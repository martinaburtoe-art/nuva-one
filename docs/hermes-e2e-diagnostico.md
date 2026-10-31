# Diagnóstico E2E de Hermes — Nüva One

**Fecha:** 2026-10-26  
**Entorno:** Windows 11 local (no Codespace)  
**Rama:** `hermes-e2e-diagnostico-20261026` (desde `main` @ `74202ea5`)  
**Hermes:** v0.22.5+1315.g1f91da2 — operativo (prueba de chat verificada)

## 1. Estado de Git

- Rama actual: `main` (HEAD `74202ea5` — Merge PR #242: devcontainer + flujo remoto)
- Remoto: `https://github.com/martinaburtoe-art/nuva-one.git` (origin/main sincronizado)
- Rama `work` local existe pero no está en origen (último commit `b223ee90`: arsenal batch1)
- No hay rama `origin/work` remota
- Worktrees activos: 7 (incl. esta rama de diagnóstico en preparación)

## 2. Identificación del proyecto

- Producto: Nüva One (SaaS pymes chilenas)
- Repositorio: martinaburtoe-art/nuva-one
- Stack: React, TypeScript, Vite, TanStack Router, Tailwind CSS, Supabase/PostgreSQL
- Gestor de paquetes: ambivalente — `bun.lock` y `package-lock.json` ambos rastreados; CI usa `npm`
- Producción: https://nuva-one.vercel.app/ (últimos despliegues Ready)
- Supabase: `vnzyecnbdqbfuxawzrda` (ACTIVE_HEALTHY, no vinculado localmente)

## 3. Archivo inspeccionado

`package.json` — scripts definidos: `dev`, `build`, `lint`, `typecheck`, `test`, `verify:migrations`, `verify:factory`

## 4. Comprobaciones locales ejecutadas (Fase 3)

| Comprobación | Estado | Resultado |
|---|---|---|
| TypeScript (`tsc --noEmit`) | PASS | 0 errores |
| Lint (`eslint .`) | PASS | 0 errores, 668 warnings pre-existing (`no-explicit-any`) |
| Tests (`vitest run`) | PASS | 86 archivos, 337 tests, 23.96s |
| Build (vite build) | PASS | 10.60s, .vercel/output generado |

## 5. Cambios de esta prueba

Archivo creado: `docs/hermes-e2e-diagnostico.md` (este archivo)  
Rama: `hermes-e2e-diagnostico-20261026`  
No se modificaron archivos de negocio ni secretos.  
Sin commit, sin push — pendiente de revisión y autorización del usuario.

## 6. Hallazgos relevantes

- `bun.lock` tiene cambios sin commit (+1532 líneas) — requiere revisión antes de incluir en main
- Múltiples archivos `.bak` y directorios no rastreados existen en el working tree
- Supabase CLI no vinculado localmente (faltan credenciales de acceso)
- 10 PRs abiertos en GitHub, varios mergeables (incl. #238 lint cleanup, #237 owner console)
- CI principal en `main`: verde (CI, Production Smoke, Nüva People build)
- Dos workflows auxiliares con fallo: AI Gateway Live Certification, Durable Autonomous Agent Worker