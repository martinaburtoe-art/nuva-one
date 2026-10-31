# PROJECT_STATE — Nüva One

Estado real del proyecto, verificado el 2026-10-29. Este archivo es la única fuente de verdad operativa para la continuidad de sesiones.

## Repositorio y rama
- Repo: `martinaburtoe-art/nuva-one`
- Directorio local: `C:\Users\marti\Documents\nuva-one`
- Rama de trabajo: `fix/reproducible-npm-ci-20261027`
- HEAD: `226241fe` (publicada en origen)
- Base `main`: `4c27fabe`
- PR #252: abierto, sin merge, head `fix/reproducible-npm-ci-20261027` → base `main`
- Working tree: limpio salvo `src/routeTree.gen.ts` (solo cambio LF/CRLF, excluido intencionadamente)

## Últimos commits en la rama
- `edbbce07` — `src/lib/biz-data.ts`: `useBizDelete`/`useBizUpdate` con guardia `if (!active) throw` y filtro `.eq("business_id", active.id)`
- `b0656810` — `src/lib/biz-data.test.tsx` + `vitest.config.ts`: pruebas de regresión, include `*.test.tsx`, `// @vitest-environment happy-dom` scoped solo a ese test
- `921fb2d6` — `src/lib/use-business.ts` (sin auto-fallback, `active=null`, `businessId=activeId`), `src/routes/_authenticated/settings.tsx` (`deleteBusiness` con `if (!isOwner) return;`), `src/lib/biz-data.test.tsx` (hooks incondicionales en `MountHook`)
- `2aa31959` — `docs/factory/BLOCKERS.md` (B-007: briefing matutino cron falla con deadlock de OpenAI), `docs/factory/ORCHESTRATOR.md` (orquestador mínimo viable de Nüva One Factory)
- `e12bfa1b` — `docs(factory)`: actualizar estado tras mutación testing y nuevo ciclo (PROJECT_STATE.md, TASK_REGISTRY.md, NEXT_ACTIONS.md)
- `226241fe` — `docs(factory)`: registrar CI 11/11 PASS de PR #252 y mutación testing (PROJECT_STATE.md, TASK_REGISTRY.md)

## Resultados de validación (vigentes, 2026-10-29 — reejecutados esta sesión)
- `npm run typecheck` (`tsc --noEmit`): **PASS** (exit 0, 0 errores)
- `npm run lint`: **0 errores** (679 warnings preexistentes, todos `@typescript-eslint/no-explicit-any`; sin nuevos)
- `npm test` (`vitest run`): **351/351 PASS** (88 archivos), 26.8s
- `npm run build` (vite): **PASS** (~5.8s, output `.vercel/`/nitro)
- PR #252 CI checks: **11/11 PASS** (lint, typecheck, test, build, pgTAP, safety-gate, review, production-smoke, web-qa, Vercel preview, Factory release evidence) — verificado con `gh pr checks 252`, estado actual a HEAD `226241fe`

## Mutación testing — biz-data.test.tsx (verificado hoy, evidencia real)
- Mutación aplicada: eliminado `.eq("business_id", active.id)` de `useBizDelete` y `useBizUpdate` en `src/lib/biz-data.ts`
- Resultado: **6/8 fallan** (todos los que verifican `business_id="biz-activo"` en los filtros); **2/8 pasan** (guardia "sin negocio activo", independiente del filtro)
- Mutación revertida: **8/8 pasan**
- Conclusión: los tests **detectan correctamente regresiones** de `useBizUpdate`/`useBizDelete`; los mocks no permiten falsos positivos cuando falta el filtro `business_id`
- `src/lib/biz-data.ts` sin cambios permanentes (working tree limpio salvo `routeTree.gen.ts`)

## Arquitectura y dependencias (runtime)
- Frontend: React + TanStack Router, TanStack Query, shadcn/ui, Tailwind
- Backend/BaaS: Supabase (proyecto `vnzyecnbdqbfuxawzrda`, ACTIVE/HEALTHY), RLS habilitada
- Despliegue: Vercel (`https://nuva-one.vercel.app/`, despliegue Ready)
- Pruebas: Vitest + happy-dom (scoped), 350 tests
- Migraciones: `supabase/migrations/` (303 archivos SQL locales)

## Aislamiento multiempresa (estado)
- `useActiveBusiness()`: devuelve `null` si no hay `activeId` válido ni el negocio está en la lista. **Sin fallback a `businesses?.[0]`.**
- `useMyMembership()`: `businessId = activeId`, `enabled: !!businessId`
- `useBizDelete`/`useBizUpdate`: guardia `if (!active) throw` + `.eq("business_id", active.id)`
- `settings.tsx:59` `deleteBusiness`: `if (!active) return; if (!isOwner) return;` + `.eq("id", active.id)` (tabla `businesses` no tiene columna `business_id`); RLS servidor restringe DELETE a `auth.uid() = owner_id`
- Caché React Query: invalidada por `[table, active?.id]` tras mutaciones en `biz-data.ts`; `__root.tsx` invalida todo en `SIGNED_OUT`
- Todos los módulos de `_authenticated/` usan `business_id` o RPC con `p_business_id`

## T-08 — Auditoría profunda de módulos `_authenticated/` (COMPLETADA, 2026-10-29)
- Alcance: 43/43 rutas de `src/routes/_authenticated/` inspeccionadas individualmente (ai, billing, catalog, customer-*, finance-*, help-center, mfa-required, mobile-scanner, people-*, pricing-calculator, shifts, shipments, route, nuva-intelligence, quotes, purchases, caja-control, pos, people, finance, analytics, conexiones, inventory, inventario-operaciones, inventario-conteo, sales, dashboard).
- Matriz de cobertura: todas las rutas con `ModuleGuard` salvo `conexiones.tsx` y `inventory.tsx` (wrappers sin guard propio, expuestos vía rutas con guard; P3).
- Lecturas/escrituras: filtradas por `business_id` del negocio activo o RPC con `p_business_id`; sin escrituras huérfanas detectadas en capa cliente.
- Fase 4 de esta sesión — verificación de los 4 RPC críticos (todas **server-side seguras**, downgrade de P2 a P3 / defense-in-depth):
  - `deleteShift` (`shifts-table.tsx:204`): RLS en `public.shifts` restringe DELETE a `has_business_role(business_id, auth.uid(), [owner, admin])`. El aislamiento lo impone el servidor aunque el cliente no filtre por `business_id`. → P3 (añadir `business_id` al query del cliente como defense-in-depth).
  - `convert_quote_to_sale` (`20260920044000_secure_quote_conversion.sql`): SECURITY INVOKER, business derivado de `quotes.business_id`, `has_business_role` verificado, `FOR UPDATE` en la cotización. → P3.
  - `finalize_inventory_stocktake` (`20260819123000_inventory_stocktake_atomic_finalize_v2.sql`): SECURITY DEFINER con `search_path` controlado, business derivado de `inventory_stocktakes`, `FOR UPDATE` en stocktake y producto, `has_business_role` verificado. → P3.
  - `create_fast_sale` (`20260920024000_harden_fast_sale_available_stock.sql`): SECURITY INVOKER, business derivado de `business_members` del usuario autenticado, stock bloqueado con `FOR UPDATE`, validación de disponibilidad, triggers `validate_sale_inventory`/`apply_sale_effects` verifican `NEW.business_id`. → P3.
- Hallazgo P3: `conexiones.tsx` y `inventory.tsx` sin `ModuleGuard` propio.
- Fase 4 cerrada: **todos los 4 RPC críticos verificados seguros en servidor**. No hay vulnerabilidad P2/P1 en el aislamiento multiempresa. La ausencia de `business_id` en parámetros de cliente se compensa con RLS y autorización en servidor.
- Defectos locales seguros corregidos en sesiones previas de T-06/T-07 (`biz-data` guardia + filtro `business_id`, `use-business` sin auto-fallback, `settings.delete` con `isOwner`) con mutación testing 6/8 fallan → 8/8 PASS tras revertir; sin cambios permanentes de código en el working tree de esta sesión.
- Pruebas de regresión `src/lib/biz-data.test.tsx`: 8/8 PASS (los mocks detectan la ausencia del filtro `business_id`).
- Puertas de calidad post-auditoría: typecheck PASS, lint 0 errores, tests 351/351 PASS, build PASS — sin regresiones.

## T-13 — Skill `nuva-ci-diagnostics` (COMPLETADA, 2026-10-29; verificada en T-13.1)

- `scripts/ci-diagnostics.py`: diagnóstico de CI ejecutable (solo lectura) que lee `gh pr checks <n>`, clasifica cada check (PASS/FAIL/WARN/BLOCKED/UNKNOWN), examina logs de fallos, redacta secretos y produce informe estructurado con causa raíz, acciones y siguiente tarea. Versionado en commit `fe633201`, rama publicada en origen.
- `tests/test_ci_diagnostics.py`: 9/9 pruebas con fixtures simulados (todos PASS, un fallo, pendiente, cancelado, sin auth, timeout, incompleto, redacción de secretos, mapeo de estados). Versionado en commit `fe633201`.
- `scripts/__init__.py`: paquete para importar el módulo del skill. Versionado en commit `fe633201`.
- Diagnóstico real PR #252: 11/11 checks PASS, causa raíz confirmada (CI verde), sin bloqueos. Ejecutado sobre HEAD `226241fe` → PR ahora apunta a `fe633201` tras push.
- Puertas de calidad post-T-13: typecheck 0, lint 0, tests 351/351 PASS, build PASS — sin regresiones.
- Integración CI: paso añadido a `.github/workflows/ci.yml` en el job `build-and-test` (setup-python + `python scripts/ci-diagnostics.py --self-test` + `python tests/test_ci_diagnostics.py`).
- T-13.1 verificación: archivos confirmados versionados (git ls-files), pruebas reproducibles (9/9 PASS, 7/7 self-test), diagnóstico real verificado (11/11 CI PASS + 4/4 locales PASS), integración en CI confirmada.

| Bloqueo | Impacto | Acción requerida |
|---|---|---|
| No se pueden leer secretos de Vercel (`[REDACTED]`) | No se puede confirmar igualdad `VITE_SUPABASE_PUBLISHABLE_KEY` == `SUPABASE_PUBLISHABLE_KEY` | Usuario debe verificar sincronización de env |
| `vercel logs` sin salida utilizable | No se descarta `401 UNAUTHORIZED_INVALID_API_KEY` / `bad_length` en producción | Evidencia de logs pendiente |
| Flujo OAuth final, persistencia de sesión, consulta de `businesses` requiere credenciales de Google del propietario | No se puede completar verificación de producción sin ellas | Usuario debe proveer credenciales o aprobar flujo solo-local |
| No hay `service_role` key ni acceso de solo lectura al esquema remoto | RLS de `public.businesses` verificada vía `pg_policies`, pero sin inspect remoto completo | Usuario debe aportar acceso o aprobar flujo solo-local |
| No hay pila Supabase local (`docker ps` → `NO_SUPABASE_STACK`) | Solo análisis estático de migraciones posible | No bloqueante para desarrollo |
|| `happy-dom ^21.0.4` instalado y verificado | `npm audit` no reporta vulnerabilidad de happy-dom (solo 1 moderada en `seroval`, no relacionada). B-006 **RESUELTO**. | Ninguna acción requerida; BLOCKERS.md actualizado. |
| `bun.lock` tiene zod 4.0.0 inconsistente con package.json ^4.6.6 | No se regenera por restricción de usuario | Decisión de usuario sobre `bun.lock` o `npm install` |
| Branch protection en `main` no activada | Riesgo de push directo | Acción del propietario en GitHub |
| Briefing matutino (cron) falla con deadlock de OpenAI (B-007) | Afecta automatización continua de Hermes | Diagnosticar deadlock del cliente OpenAI en el job cron; depende de B-001 |

## Producción
- URL: `https://nuva-one.vercel.app/`
- Supabase: `vnzyecnbdqbfuxawzrda`, Google OAuth habilitado, `site_url`/`uri_allow_list` apuntan a Vercel
- **No desplegado ni mergeado a `main` sin autorización explícita.**

## ReciConti
- Proyecto `qajygywlobkdhdatixtg` — **PROHIBIDO tocar.**
