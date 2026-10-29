# PROJECT_STATE — Nüva One

Estado real del proyecto, verificado el 2026-10-29. Este archivo es la única fuente de verdad operativa para la continuidad de sesiones.

## Repositorio y rama
- Repo: `martinaburtoe-art/nuva-one`
- Directorio local: `C:\Users\marti\Documents\nuva-one`
- Rama de trabajo: `fix/reproducible-npm-ci-20261027`
- HEAD: `2aa31959` (publicada en origen)
- Base `main`: `4c27fabe`
- PR #252: abierto, sin merge, head `fix/reproducible-npm-ci-20261027` → base `main`
- Working tree: limpio salvo `src/routeTree.gen.ts` (solo cambio LF/CRLF, excluido intencionadamente)

## Últimos commits en la rama
- `edbbce07` — `src/lib/biz-data.ts`: `useBizDelete`/`useBizUpdate` con guardia `if (!active) throw` y filtro `.eq("business_id", active.id)`
- `b0656810` — `src/lib/biz-data.test.tsx` + `vitest.config.ts`: pruebas de regresión, include `*.test.tsx`, `// @vitest-environment happy-dom` scoped solo a ese test
- `921fb2d6` — `src/lib/use-business.ts` (sin auto-fallback, `active=null`, `businessId=activeId`), `src/routes/_authenticated/settings.tsx` (`deleteBusiness` con `if (!isOwner) return;`), `src/lib/biz-data.test.tsx` (hooks incondicionales en `MountHook`)
- `2aa31959` — `docs/factory/BLOCKERS.md` (B-007: briefing matutino cron falla con deadlock de OpenAI), `docs/factory/ORCHESTRATOR.md` (orquestador mínimo viable de Nüva One Factory)

## Resultados de validación (vigentes, 2026-10-29)
- `npx vitest run`: **350/350 PASS** (88 archivos), 14.5s
- `npm run typecheck`: **PASS** (exit 0)
- `npm run build`: **PASS** (3.35s, output `.vercel/`)
- `npm run lint`: **0 errores** (668-681 warnings preexistentes, sin nuevos)
- ESLint en `src/lib/biz-data.test.tsx`: **0 errores**
- PR #252 CI checks: **11/11 PASS** (lint, typecheck, test, build, pgTAP, safety-gate, review, production-smoke, web-qa, Vercel preview, Factory release evidence) — verificado con `gh pr checks 252`

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

## Riesgos y bloqueos vigentes
| Bloqueo | Impacto | Acción requerida |
|---|---|---|
| No se pueden leer secretos de Vercel (`[REDACTED]`) | No se puede confirmar igualdad `VITE_SUPABASE_PUBLISHABLE_KEY` == `SUPABASE_PUBLISHABLE_KEY` | Usuario debe verificar sincronización de env |
| `vercel logs` sin salida utilizable | No se descarta `401 UNAUTHORIZED_INVALID_API_KEY` / `bad_length` en producción | Evidencia de logs pendiente |
| Flujo OAuth final, persistencia de sesión, consulta de `businesses` requiere credenciales de Google del propietario | No se puede completar verificación de producción sin ellas | Usuario debe proveer credenciales o aprobar flujo solo-local |
| No hay `service_role` key ni acceso de solo lectura al esquema remoto | RLS de `public.businesses` verificada vía `pg_policies`, pero sin inspect remoto completo | Usuario debe aportar acceso o aprobar flujo solo-local |
| No hay pila Supabase local (`docker ps` → `NO_SUPABASE_STACK`) | Solo análisis estático de migraciones posible | No bloqueante para desarrollo |
| `happy-dom ^20.11.0` vulnerable (CVE-2026-33943) | Fix requiere mayor 21.0.4 (breaking change en tests) | Documentado como WARN pendiente |
| `bun.lock` tiene zod 4.0.0 inconsistente con package.json ^4.6.6 | No se regenera por restricción de usuario | Decisión de usuario sobre `bun.lock` o `npm install` |
| Branch protection en `main` no activada | Riesgo de push directo | Acción del propietario en GitHub |
| Briefing matutino (cron) falla con deadlock de OpenAI (B-007) | Afecta automatización continua de Hermes | Diagnosticar deadlock del cliente OpenAI en el job cron; depende de B-001 |

## Producción
- URL: `https://nuva-one.vercel.app/`
- Supabase: `vnzyecnbdqbfuxawzrda`, Google OAuth habilitado, `site_url`/`uri_allow_list` apuntan a Vercel
- **No desplegado ni mergeado a `main` sin autorización explícita.**

## ReciConti
- Proyecto `qajygywlobkdhdatixtg` — **PROHIBIDO tocar.**
