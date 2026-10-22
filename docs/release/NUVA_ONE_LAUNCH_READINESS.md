# NUVA_ONE_LAUNCH_READINESS — Matriz de lanzamiento

Actualizado: 2026-10-22 (bloque de trabajo nocturno 23:17→~12:40 local) · Auditor: Hermes Agent (JARVIS)
Convención: `PASS` (probado con evidencia) · `WARN` · `FAIL` · `UNKNOWN` · `BLOCKED`. Nada se declara por lectura de código o por compilar.

## 1. Resumen ejecutivo

- **Estado técnico base: verde.** Build de producción (vite 8 + nitro/vercel) exit 0 en 5.2s; typecheck 0 errores; 308/308 tests; `npm audit --audit-level=high` **0 vulnerabilidades** (antes 11, 8 high). El bloqueador de lanzamiento reportado por la auditoría del 18-oct (build roto) quedó resuelto.
- **Seguridad de datos laborales: en revisión seria.** PR #234 (endurecimiento People owner/admin) revisado por este auditor: causa raíz del fallo de CI corregida (vista `security_invoker` sobre función de proyección segura), suite pgTAP 61 aserciones VERDE en CI, invariant 999 VERDE. Fusión sigue bloqueada por trabajo de frontend y cobertura (abajo).
- **Criterio de lanzamiento: NO LISTO todavía** — bloqueadores concretos en §14, todos con acción identificable. Nada crítico sin mitigación conocida.

## 2. Estado del repositorio

| Item | Estado | Evidencia |
|---|---|---|
| Rama activa local | `work` @ `d1cd9a71` (+ `25586171`) — reparación de dependencias + auditoría, **sin push** (pendiente autorización; repo público incluye WIP del usuario) | `git log` |
| `main` | c2dbcd1b, sin branch protection (`gh api` 404) | WARN |
| Producción | https://nuva-one.vercel.app → 200 (/, /dashboard) | curl |
| CI sobre `main` | workflows programados en verde (agency, QA, métricas) | `gh run list` |

## 3. Inventario de módulos

`docs/audit/ARCHITECTURE_AUDIT-2026-10-22.md` — 42 rutas autenticadas, API servidor (billing/checkout, chat, crons), módulo agency autónomo, 297 migraciones, 7 edge functions. Matriz funcional por módulo: PENDIENTE (Fase 4 de la misión, requiere sesión autenticada).

## 4. Hallazgos priorizados

| ID | Pri | Hallazgo | Estado |
|---|---|---|---|
| SEC-01 | P1 | Políticas member-wide en tablas People sensibles → PR #234 (18 tablas owner/admin + vista operativa) | Técnica VERDE en CI; fusión BLOQUEADA (frontend staff, cobertura) |
| SEC-04 | P2 | 11 vulns npm (8 high) | **RESUELTO**: 0 vulns (commit d1cd9a71, verificado) |
| SEC-02 | P2 | `main` sin branch protection | ABIERTO — decisión del propietario |
| SEC-03 | P2 | Sin CSP en vercel.json | ABIERTO — propuesta pendiente |
| SEC-09 | P2 | Defender AV interfiere installs node | ABIERTO — exclusión requiere admin |
| DEP-01 | P3 | recharts 2.13 vs React 19 (peers) | Documentado; migración v3 pendiente |
| LINT-01 | P3 | 56 errores react-hooks v7 + 624 `no-explicit-any` | Backlog de refactor |
| DRIFT-01 | P2 | RPCs `people_dashboard_summary` / `finance_dashboard_summary` invocados por el frontend y AUSENTES de las migraciones | UNKNOWN — verificar con acceso BD |
| DEP-02 | P3 | Doble lockfile (bun.lock muerto + package-lock canónico) + *.bak | Decisión de unificación pendiente |

## 5. Vulnerabilidades y privacidad

- RLS: todas las tablas públicas la tienen habilitada (**verificado en vivo** por aserción 2 de `999_security_invariants` en CI contra la cadena completa — corrección del falso positivo estático del 21-oct).
- Anon denegado por defecto (sondeo REST 42501, 21-oct). Service-role confinado a módulos server (SEC-07 PASS). Sin secretos en repo (SEC-06 PASS).
- People sensible: PR #234 en revisión (arriba). RPC de nómina con guard owner/admin verificado en migraciones (`calculate_people_payroll_period` SECURITY INVOKER + has_business_role; `review_people_leave_request`; `generate_people_liquidations`).
- Pendiente: CSP, pruebas autenticadas por rol/tenant, cobertura de `people_attendance_events`/`people_org_units`/`people_requests`.

## 6. Integridad de base de datos

- Cadena de 297 migraciones aplica limpia en base efímera de CI en cada corrida + **recovery drill** (rebuild desde migraciones) en ci.yml. pgTAP suite completa (50 archivos) VERDE tras el fix del PR #234 (run 39802971994, "pgTAP database tests PASS 3m1s").
- Backup/restauración: procedimiento no verificado — **UNKNOWN/BLOCKED** sin acceso al dashboard Supabase.

## 7. Resultados de pruebas

| Gate | Resultado | Evidencia |
|---|---|---|
| `npx tsc --noEmit` | **PASS** (0 errores) | verify-post-auditfix2 log |
| `npm test` (vitest) | **PASS** 84 archivos / 308 tests | ídem |
| `npm run build` | **PASS** exit 0, 5.24s | b6-build.log |
| `npm run lint` | **WARN** 56 errores (react-hooks v7) + 645 warnings — corre sin crash | b6-lint.log |
| `npm audit --audit-level=high` | **PASS** 0 vulnerabilidades | exit 0 |
| pgTAP (CI, efímero) | **PASS** (branch PR #234; base main idéntico) | run 39802971994 |
| E2E autenticado | **BLOCKED** — sin cuenta de prueba | — |

## 8. Rendimiento

Medición local 21-22/oct (build real): entrada principal 372.98 KB (gzip 116.82); exceljs 908/jspdf 392/recharts 366 KB diferidos; CSS 201 KB (gzip 28.8). Code-splitting sano. Referencias históricas (848→662 KB) NO comparables directamente (cambió el bundler). Lighthouse/CWV: **UNKNOWN** (sin sesión). Re-medir post-merge en preview.

## 9. Visual y responsive

Tokens oklch light/dark coherentes, reduced-motion global PASS, focus-visible PASS, 47 componentes ui (auditoría en docs/audit/DESIGN_AUDIT-2026-10-22.md). Verificación visual real del dashboard: **BLOCKED** (cuenta de prueba). PR #230 (Resumen fullscreen) sin revisar aún.

## 10. SEO y página pública

PR #231 abierto, sin revisar en este bloque: **UNKNOWN**. Sitio público responde 200; título/meta/canonical/sitemap sin auditar todavía.

## 11. Operación y observabilidad

CI programada en verde (agency sentinel, web QA, métricas, watch); edge functions owner-metrics/operational-metrics/telemetry presentes; alertas de fallos de jobs vía GitHub Actions. Manual de diagnóstico y rollback de BD: **UNKNOWN/BLOCKED** (acceso dashboard).

## 12. Preparación comercial Chile

- Motor de nómina CL verificado en código: UF, IUSC por tramo, AFP/comisiones, AFC, SIS, tope previsional, gratificación, LRE, finiquito — con parámetros legales versionados (`people_legal_parameters`). **WARN**: exactitud tributaria/legal requiere revisión profesional humana.
- Formatos CLP/es-CL usados en pantallas (`toLocaleString("es-CL")`).
- Términos/privacidad/protección de datos (Ley 21.719): **PENDIENTE — revisión jurídica humana**.
- Checkout/billing (MercadoPago/Stripe): funcionalmente presente; pruebas con cobros reales: **PROHIBIDAS/BLOCKED** por diseño.

## 13. PRs abiertos y dependencias

| PR | Título | Estado tras este bloque |
|---|---|---|
| #234 | security(people) sensitive data | Revisado + corregido (commits 2a1cf79b, 55962793, a3d1556c); pgTAP PASS; audit-fail del CI es PREEXISTENTE de main (vite 8.0-8.1 high) — se resuelve con el PR de dependencias |
| #230 | Resumen fullscreen | Sin revisar |
| #231 | SEO técnico | Sin revisar |
| #227 | knip dependency audit | Sin revisar (converge con DEP-02) |
| #222 | agency worker fix | Sin revisar |
| #219 | readiness docs | Sin revisar |

## 14. Bloqueadores de lanzamiento (ordenados)

1. **Fusión autorizada del work de dependencias** (commits 25586171 + d1cd9a71 en `work`, sin push): resuelve vite high (el check rojo del CI de #234) y deja audit en 0. **Requiere: autorización de push de Don Martín.**
2. **Frontend de People para staff** (PR acompañante de #234): vistas operativas para absences/leave/vacations o gating por rol — sin él, el merge de #234 rompe pantallas de staff.
3. **Cobertura restante People**: attendance_events/org_units/requests + RPCs sin versionar (DRIFT-01).
4. **Pruebas E2E autenticadas** por rol y entre empresas — requiere cuenta(s) de prueba.
5. **Branch protection de `main`** — decisión del propietario.
6. **Revisión jurídica** (términos, privacidad, 21.719) — humana.
7. Vercel login + token Supabase (gestión) — acciones del usuario.

## 15. Riesgos aceptados y responsable

| Riesgo | Mitigación actual | Responsable de aceptar |
|---|---|---|
| Lint 56 errores react-hooks v7 | No bloquea build; backlog por módulo | Don Martín (deuda visible) |
| recharts 2.13 vs React 19 | `--legacy-peer-deps` documentado; funciona | Don Martín |
| DRIFT-01 (RPCs sin versionar) | Marcado; pantallas posiblemente rotas en prod | Don Martín + acceso BD |

## 16. Despliegue controlado (propuesto)

1. Push `work` → PR `fix(deps)` → CI verde → merge a main (protección ya activa idealmente).
2. PR #234 + PR frontend de staff → juntos tras CI verde → merge.
3. Preview Vercel → smoke manual con cuenta de prueba → promover.
4. Verificar `/` y `/dashboard` + consola en producción.

## 17. Plan de rollback

- Vercel: rollback al deployment anterior (CLI `vercel rollback` o dashboard — requiere login).
- Migraciones: PR #234 es aditivo-restictivo; reversión = revert del commit de merge y re-aplicar políticas previas desde git (las políticas dropeadas están en el historial de migraciones). Procedimiento completo a documentar antes del merge.

## 18. Checklist post-despliegue

- [ ] `curl` / y /dashboard → 200 + smoke autenticado.
- [ ] CI completo verde en `main`.
- [ ] Prueba de aislamiento con 2 usuarios de prueba (owner A vs miembro B en otra empresa): lectura denegada.
- [ ] Pantallas People: owner ve datos completos; staff ve directorio operativo; listas de ausencias para staff SIN datos (hasta el PR de frontend).
- [ ] npm audit 0 en CI de main.
- [ ] Monitorear agency sentinel 24h (alertas de errores de jobs).
