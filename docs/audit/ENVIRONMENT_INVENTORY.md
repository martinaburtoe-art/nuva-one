# ENVIRONMENT_INVENTORY — Nüva One

Fecha: 2026-10-21 (hora local UTC-3) · Auditor: Hermes Agent (JARVIS) · Estado: **EN PROGRESO**

## 1. Entorno local

| Componente | Versión / Estado | Verificado |
|---|---|---|
| SO | Windows 11 (git-bash / MSYS) | PASS (hostname ≠ usuario; home = C:\Users\marti) |
| Node.js | v24.16.0 | PASS |
| npm | 11.13.0 | PASS |
| Git | 2.53.0.windows.3 | PASS |
| Python | 3.14.7 | PASS |
| Hermes Agent | v0.22.2+1692.g22063fc.dirty (stable, git install) | PASS |
| Supabase CLI | 2.109.1 | PASS (instalado) |
| Vercel CLI | 59.14.0 | WARN — **deslogueado** (whoami falla; requiere `vercel login`) |
| GitHub CLI | autenticado, cuenta activa `martinaburtoe-art` (+ `martinaburtoes` inactiva) | PASS |

## 2. Repositorio local — C:\Users\marti\Documents\nuva-one

- Confirmado como el repo correcto: `origin = https://github.com/martinaburtoe-art/nuva-one.git` (PASS).
- Rama activa: `work` @ `c2dbcd1b` (idéntica a `main` local y `origin/main`).
- Ramas: `main` (protegida: **NO** — sin branch protection), `work` (sin upstream), `integration/hermes-controlled-execution-20261015`.
- Commit de referencia inicial: `c2dbcd1b fix(resumen): improve contrast on light dashboard cards`.

### Cambios sin confirmar del usuario (PRESERVADOS — no tocar)

Staged: `package.json` (27 líneas), `src/lib/finance-period.ts` (9), `src/routeTree.gen.ts` (1848), `vite.config.ts` (1).
Unstaged: `bun.lock` (1532), `package-lock.json` (1756), `package.json` (7).
Untracked: `bun.lock.backup`, `docs/audit/` (19 archivos de auditoría previa + evidencia nueva), `package.json.bak`, `tsconfig.json.bak`, `vite.config.ts.bak`.
Stashes: `stash@{0}` y `stash@{1}` (ambos sobre main).

Estos cambios corresponden al trabajo previo documentado en `docs/audit/` (fixes de `minimatch`, `zod` v4, `finance-period.ts` UTC). **No se ejecutó `npm install`** para no alterar ese estado en curso.

### Mecanismo de recuperación

- Respaldo del estado sin confirmar: `docs/audit/evidence/2026-10-21_baseline-uncommitted.patch` (540 KB) + `2026-10-21_git-status.txt`.
- Estrategia: commits pequeños y reversibles sobre la rama `work`, sin tocar los cambios del usuario; sin operaciones destructivas (prohibido por AGENTS.md: repo conectado a Lovable, no reescribir historia publicada).

## 3. Proyecto

- `package.json`: React 19, TanStack Router/Start 1.170.x, Vite 8 (rolldown), Tailwind 4, TypeScript 5.6.2, Supabase JS 2.108.x, Stripe 22, AI SDK 6, recharts, react-hook-form, zod 4, Capacitor (app Android).
- Scripts relevantes: `dev`, `build` (con `scripts/smooth-launch-exit.mjs`), `lint`, `typecheck` (pretypecheck = vite build dev), `test` (vitest), `verify:migrations`, serie `agency:*` (QA autónoma previa).
- Lockfiles DUPLes: `bun.lock` y `package-lock.json`, ambos modificados — deuda técnica a resolver (riesgo de drift).
- `node_modules`: 519 paquetes presentes, pero según auditoría previa quedó **inconsistente** (fallos `bun install` con esbuild ENOENT). En re-verificación (job de fondo).
- Variables de entorno: NO existe `.env` local; solo `.env.example` con 38 nombres (Supabase ×7, MercadoPago ×3, Stripe ×3, Meta/WhatsApp ×6, IA ×13, CRON_SECRET, SITE_URL, LOVABLE ×3).
- `.vercel/` existe pero `project.json` vacío/ausente → link local de Vercel incompleto.
- `supabase/config.toml`: `project_id = "vnzyecnbdqbfuxawzrda"` — coincide con el proyecto esperado (PASS).
- CI en `main`: 5+ workflows programados activos y en verde (Durable Agent Worker, ML Anomaly Detection, Web QA, Operational Metrics, Production Watch).
- PRs abiertos: #231 (SEO técnico), #230 (Resumen fullscreen), #227 (auditoría knip), #222 (fix agency worker), #219 (docs readiness).

## 4. Riesgos detectados

1. `main` sin branch protection (cualquier push pasa directo a producción).
2. Estado de dependencias inconsistente (bun vs npm, node_modules parcial).
3. Sin `.env` local: pruebas/auditoría con datos reales limitadas a claves públicas del bundle.
4. Cambios del usuario sin confirmar mezclados con fixes previos — deben commitearse con cuidado (por separado, cuando el usuario autorice).
5. Según auditoría previa: build de producción roto (rolldown, `react-day-picker`/`recharts`) — re-verificando ahora.
6. Disco C: al 95% (13 GB libres) — holgura justa para reinstalaciones de node_modules; vigilar el espacio.
7. Conflicto de peers resuelto: `zod` 4.0.0 → `^4.1.8` (exigencia de `@ai-sdk/openai-compatible` ^4.1.8; mantiene la intención zod v4 del trabajo previo).

## 5. Pendiente de verificación

- Resultado de lint/typecheck/tests/build/audit (job en curso → `evidence/baseline-verify-2026-10-21.log`).
- Acceso administrativo a Supabase (CLI sin `SUPABASE_ACCESS_TOKEN`).
- Login de Vercel CLI (requiere acción del usuario).
