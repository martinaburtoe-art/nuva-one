# TEST_RESULTS — Nüva One

Fecha: 2026-10-22 · Auditor: Hermes Agent (JARVIS) · Entorno: local, rama `work` @ `c2dbcd1b` + fixes sin commitear (ver EXECUTION_LOG)

## Evolución de la verificación (3 rondas)

| Prueba | Ronda 1 (pre-reparación) | Ronda 2 (post `npm install`) | Ronda 3 (post `npm ci`) | Estado final |
|---|---|---|---|---|
| Lint (`npm run lint`) | **FAIL** — crash: falta `flatted` (exit 2) | **FAIL** — crash: falta `@typescript-eslint/scope-manager/analyze` (exit 2) | **exit 1** — corre: 56 errores + 645 advertencias | WARN (corre; deuda de código) |
| Typecheck (`npx tsc --noEmit`) | **FAIL** — ~170 errores (exit 2) | **FAIL** — 2 errores reales (exit 2) | **PASS** — 0 errores (exit 0) | **PASS** |
| Tests (`npm test`, vitest) | **FAIL** — no arranca: falta vite anidado (exit 1) | **exit 1** — 300 pasan, 2 suites no cargan (paquetes dañados) | **PASS** — **84 archivos / 308 tests, 0 fallos** (exit 0) | **PASS** |
| Build (`npm run build`) | **FAIL** — falta `@rolldown/pluginutils` (exit 1) | **FAIL** — falta `tapable` (exit 1) | **PASS** — **✓ built in 11.39s** + nitro vercel (exit 0) | **PASS** |
| `npm audit --audit-level=high` | exit 1 — 11 vulns (8 high) | igual | igual (sin cambios) | WARN (solo dev-toolchain) |

Evidencia por ronda:
- Ronda 1: `evidence/baseline-verify-2026-10-21.log` (317 líneas)
- Ronda 2: `evidence/baseline-verify-2-2026-10-22.log` (178 líneas)
- Ronda 3: `evidence/b3-lint.log`, `evidence/b3-tsc.log` (vacío = 0 errores), `evidence/b3-test.log`, `evidence/b3-build.log`, `evidence/npmci-2026-10-22.log`

## Causa raíz de la ronda 1 (documentada)

`node_modules` dañado por rollback parcial de `bun install` (esbuild ENOENT, ver docs/audit/PROGRESS.md previo): 20+ paquetes con archivos ausentes + daño intra-paquete. Reparación: `zod` → `^4.1.8` (conflicto ERESOLVE real) + `npm ci --legacy-peer-deps --ignore-scripts` (827 paquetes, 5 min) + verificación manual de esbuild (`npx esbuild --version` → 0.25.0 OK). Primer `npm ci` sin `--ignore-scripts` murió por ACCESS VIOLATION en esbuild postinstall (interferencia de antivirus, ver SECURITY_AUDIT SEC-09).

## Estado final de cada gate

| Gate | Estado | Nota |
|---|---|---|
| Typecheck | **PASS** | 0 errores tras fixes: `finance-period.ts` (completó el fix UTC del usuario) y `vite.config.ts` (alias lodash muerto eliminado) |
| Tests unitarios | **PASS** | 308/308; incluye pruebas de períodos fiscales, concurrencia de inventario y agencia |
| Build producción | **PASS** | Cliente + SSR nitro (preset vercel) → `.vercel/output/` (39 MB) |
| Lint | **WARN** | Corre sin crashear; 56 errores (reglas nuevas react-hooks v7: setState-in-effect, impure render, refs en render) + 645 warnings (624 `no-explicit-any`) |
| npm audit | **WARN** | 11 vulns, todas dev-toolchain (minimatch, launch-editor, @vitest/mocker); 0 en runtime del producto |

## Cobertura NO ejecutada (por falta de credenciales/entorno)

- E2E sobre producción o preview (requiere login Vercel + cuenta de prueba).
- Pruebas RLS reales con dos usuarios (requiere acceso BD o cuentas de prueba) — ver SECURITY_AUDIT SEC-01.
- Lighthouse / Core Web Vitals medidos en navegador.
- Pruebas de pgTAP (no hay suite pgTAP local identificada; `verify:migrations` ejecutable a validar en siguiente pasada).
