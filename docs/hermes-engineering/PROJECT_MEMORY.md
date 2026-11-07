# Proyecto: Nüva One — Hermes Engineering Memory

> Memoria técnica persistente, compacta y actualizada para el entorno de ingeniería autónoma de Hermes sobre Nüva One.
> Actualizar tras cada ciclo de ingeniería. No eliminar entradas previas; marcar como obsoletas si ya no aplican.

## 1. Estado actual del repositorio

- **Rama activa**: `integ/agency-272-274`
- **HEAD**: `129ac4ca` — `feat(engineering): añade scripts de mapa de repositorio y loop autónomo de Hermes Engineering`
- **Último commit previo**: `93bd7b41` — `fix(agency): Sentinel lecturas paralelas y timeouts Vitest 4 (T-137)`
- **Rama de respaldo** (sin tocar): `backup/agency-local-20261107` — remoto, SHA `3a977052093d49536b8964fb775cb633c2d7cb4e`
- **Cambios sin commitear**: `docs/nuva-agency/AGENT_BACKLOG.md`, `logs/cycles/index.json` (ciclo T-138 previo), `docs/launch/.hermes-tmp.ZR3vft` (untracked, 0 bytes), `docs/hermes-engineering/PROJECT_MEMORY.md` (editado esta sesión), `docs/hermes-engineering/repo-map.json` (regenerado desde cero)
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
3. **Autonomous Coding Loop** ✅ — `scripts/hermes-engineering-loop.mjs` — ciclo INSPECT→PLAN→EDIT→TEST→FIX→VERIFY→RECORD con idempotencia. Éxito demostrado en tarea de cross-referencing (3 ciclos, último SUCCESS). Nota sobre autocorrección: el loop devolvió `autoFixable: false` en los 2 fallos registrados (ENOENT de `npx` en Windows; `buildSymbolCrossRef` duplicado); las correcciones fueron **manuales** vía `patch` (exec→exec con `shell:true`, eliminación de duplicado, idempotencia de `addSymbolCrossRef`). No se demostró autocorrección automática efectiva; se demostró detección de error y recuperación manual.
4. **Multi-file Engineering** ✅ — cross-referencing abarca lectura de repo map, edición de script y generación de JSON con 3952 entradas.
5. **Independent Code Review** ✅ — revisión independiente `deleg_21d90d16` (subagente separado): PASS con WARNs constructivos (cross-ref semántica débil, REPO_ROOT hardcodeado, `git add -A` evitar, inyección de shell en mensaje de commit). Recomendó commit local con `git add` explícito.
6. **QA Automation** ✅ — `vitest run` 441/441 PASS, `tsc --noEmit` exit 0, `npm run lint` 0 errores
7. **Git Engineering** ✅ — commit local `93bd7b41` (T-137) + `129ac4ca` (Hermes Engineering scripts), rama `integ/agency-272-274` preservada, respaldo `backup/agency-local-20261107` intacto. Sin push.
8. **Context Management** ✅ — `PROJECT_MEMORY.md` + `loop-log.json` (historial de ciclos incluyendo error y recuperación)
9. **Tool Orchestration** ✅ — gh CLI (GitHub), terminal, vitest, tsc, eslint, node stdlib
10. **Engineering Reports** ✅ — este informe de evidencia estructurado (PASS/WARN/FAIL) al completar el ciclo Nivel 3.

## 7. Limitaciones reales (resultados comprobados)

- **Autocorrección automática**: no demostrada. El loop devolvió `autoFixable: false` en los 2 fallos registrados; las correcciones fueron manuales (`patch`).
- **Repo map cross-ref**: semántica débil (`String.includes` sin límites de palabra → 450-490 falsos positivos/negativos); no captura nombres de bindings importados.
- **REPO_ROOT**: hardcodeado en `hermes-engineering-loop.mjs` a `C:/Users/marti/Documents/nuva-one`.
- **Shell injection**: mensaje de commit interpola `task` del usuario en `git commit -m`.
- **Supabase**: `available: false` localmente (falta `SUPABASE_URL`/`SERVICE_ROLE_KEY`); no se introdujo service_role_key.
- **Sin push**: commit `129ac4ca` está local; no se hizo push a remoto.

## 8. Pruebas reproducibles y códigos de salida

| Prueba | Comando | Código de salida | Resultado |
|--------|---------|------------------|-----------|
| Syntax check repo-map | `node --check scripts/hermes-repo-map.mjs` | 0 | OK |
| Syntax check loop | `node --check scripts/hermes-engineering-loop.mjs` | 0 | OK |
| Repo map desde cero | `node scripts/hermes-repo-map.mjs . docs/hermes-engineering/repo-map.json` | 0 | 534 archivos, 7569 símbolos, 108 deps |
| TypeScript | `npx tsc --noEmit` | 0 | PASS |
| Tests | `npx vitest run` | 0 | 441/441 PASS |
| Lint | `npm run lint` | 0 | 0 errores, 709 warnings preexistentes |
| Secretos en scripts | patrones sk-/AKIA/ghp_/eyJ/private_key | 0 | 0 hallazgos |
| Diff inspeccionado | `git diff --stat HEAD~1 HEAD` | 0 | 5 archivos, solo Hermes Engineering |

## 9. Estado Git final

- Rama: `integ/agency-272-274` (sin cambios de rama)
- HEAD: `129ac4ca` (commit local, sin push)
- 3 archivos sucios ajenos preservados sin tocar: `AGENT_BACKLOG.md`, `logs/cycles/index.json`, `.hermes-tmp.ZR3vft`
- Respaldos: `backup/agency-local-20261107` intacto (SHA `3a977052`), sin sobrescribir.

## 10. Recomendación de siguiente hito

Corregir los WARNs del revisor independiente en un commit posterior: endurecer cross-ref con límites de palabra, parametrizar REPO_ROOT, usar `git add` explícito (ya aplicado), y escapar el mensaje de commit para evitar shell injection. Luego considerar T-138 (ciclo de agencia) u otra tarea local no bloqueada por Supabase.

## 6. Convenciones de trabajo

- Antes de cada intervención: registrar rama, HEAD, estado de Git y archivos modificados.
- No restablecer, limpiar, sobrescribir ni eliminar archivos existentes.
- No hacer push, merge, migraciones ni despliegues sin autorización específica.
- No exponer claves, tokens o secretos.
- Reportar con PASS/WARN/FAIL/UNKNOWN.
- Pruebas de escritura/lectura reversibles y fuera de código de producción.
