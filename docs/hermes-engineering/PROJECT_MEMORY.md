# Proyecto: Nüva One — Hermes Engineering Memory

> Memoria técnica persistente, compacta y actualizada para el entorno de ingeniería autónoma de Hermes sobre Nüva One.
> Actualizar tras cada ciclo de ingeniería. No eliminar entradas previas; marcar como obsoletas si ya no aplican.

## 1. Estado actual del repositorio

- **Rama activa**: `integ/agency-272-274`
- **HEAD**: `93bd7b41` — `fix(agency): Sentinel lecturas paralelas y timeouts Vitest 4 (T-137)`
- **Último commit previo**: `f4c5bd2d` — `feat(agency): add integrations check script for autonomous engineering cycle`
- **Rama de respaldo** (sin tocar): `backup/agency-local-20261107` — remoto, SHA `3a977052093d49536b8964fb775cb633c2d7cb4e`
- **Cambios sin commitear**: `docs/nuva-agency/AGENT_BACKLOG.md`, `logs/cycles/index.json` (ciclo T-138 previo), `docs/launch/.hermes-tmp.ZR3vft` (untracked, 0 bytes)
- **Tests**: `vitest run` → 441/441 PASS (exit 0)
- **Typecheck**: `tsc --noEmit` → exit 0
- **Lint**: 0 errores, 709 advertencias preexistentes (ninguna en archivos de Hermes Engineering)

## 2. Arquitectura del repositorio Nüva One

- **Stack**: React + TypeScript + Vite + Vitest + ESLint + Supabase + Vercel
- **Entrypoints clave**: `src/lib/*.server.ts`, `src/routes/`, `supabase/functions/`
- **Scripts de agencia**: `scripts/agency-*.mjs` (executor, scheduler, supervisor, select-next-task, integrations-check, hermes-repo-map)
- **Especialistas de agencia**: `src/lib/agency/specialists.ts` (qa, sentinel, constructor, orchestrator, compliance, security, ux, release)
- **Backlog de tareas**: `docs/nuva-agency/AGENT_BACKLOG.md` (formato `## T-### — título` + campos `estado`, `prioridad`, `dependencias`, `criterios_de_aceptacion`, `pruebas_requeridas`)
- **Logs de ejecución**: `logs/executions/*.json` (149+ archivos), índice en `logs/cycles/index.json`

## 3. Decisiones de diseño (Hermes Engineering)

| Decisión | Razón |
|----------|-------|
| No instalar paquetes externos | Evitar dependencias nuevas; usar solo Node.js stdlib + herramientas existentes (gh, vitest, tsc, eslint) |
| Repo map basado en regex (no Tree-sitter) | Suficiente para contexto local; cero instalación; 533 archivos escaneados en <2s |
| Cada cambio útil = commit local | Patrón de Aider: git como mecanismo de revisión y deshacer |
| Revisión independiente por subagente | Patrón de Claude Code: agente separado sin modificar los mismos archivos |
| No tocar producción, sin push/merge/deploy sin autorización | Restricción explícita del usuario |
| No introducir service_role_key | Restricción explícita; causa del 403 de Supabase documentada como falta de credenciales locales |

## 4. Tareas bloqueadas (no repetir)

- **T-20, T-21, T-27, T-32** (P0): bloqueados por grants de Supabase no aplicados y despliegues de Edge Functions prohibidos.
- **T-22, T-28** (P1): dependen de T-20/T-21/T-27.
- **Alternativa local**: T-137 (tests QA/Sentinel) ya resuelta — suite verde 441/441.

## 5. Capacidades implementadas (Hermes Engineering)

1. **Repository Intelligence** ✅ — `scripts/hermes-repo-map.mjs` — mapea 533 archivos, 7499 símbolos, 108 dependencias → `docs/hermes-engineering/repo-map.json`. Incluye cross-referencing definición-vs-uso (3952 símbolos).
2. **Project Memory** ✅ — este archivo (`docs/hermes-engineering/PROJECT_MEMORY.md`)
3. **Autonomous Coding Loop** ✅ — `scripts/hermes-engineering-loop.mjs` — ciclo INSPECT→PLAN→EDIT→TEST→FIX→VERIFY→RECORD con idempotencia y autocorrección. Demostrado: SUCCESS en tarea de cross-referencing.
4. **Multi-file Engineering** ✅ — cross-referencing abarca lectura de repo map, edición de script y generación de JSON con 3952 entradas.
5. **Independent Code Review** — pendiente (delegar a subagente tras este hito)
6. **QA Automation** ✅ — `vitest run` 441/441 PASS, `tsc --noEmit` exit 0, `npm run lint` 0 errores
7. **Git Engineering** ✅ — commit local `93bd7b41` (T-137), rama `integ/agency-272-274` preservada, respaldo `backup/agency-local-20261107` intacto. Commit pendiente para cambios de Hermes Engineering.
8. **Context Management** ✅ — `PROJECT_MEMORY.md` + `loop-log.json` (historial de ciclos incluyendo error y recuperación)
9. **Tool Orchestration** ✅ — gh CLI (GitHub), terminal, vitest, tsc, eslint, node stdlib
10. **Engineering Reports** — pendiente (informe final al completar el ciclo)

## 6. Convenciones de trabajo

- Antes de cada intervención: registrar rama, HEAD, estado de Git y archivos modificados.
- No restablecer, limpiar, sobrescribir ni eliminar archivos existentes.
- No hacer push, merge, migraciones ni despliegues sin autorización específica.
- No exponer claves, tokens o secretos.
- Reportar con PASS/WARN/FAIL/UNKNOWN.
- Pruebas de escritura/lectura reversibles y fuera de código de producción.
