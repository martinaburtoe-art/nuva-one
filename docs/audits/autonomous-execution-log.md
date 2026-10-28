# Log de Ejecución Autónoma — Nüva One

Iniciado: 2026-10-25
Rama: fix/resumen-fullscreen-dashboard-20261017
HEAD: 3b6a88ab

## Entrada
- Working tree sucio: bun.lock, dashboard.tsx, resumen-premium.css, dashboard-chart.tsx, people-employees.tsx
- Archivos no rastreados: bun.lock.backup, docs/intelligence/, package.json.bak, test-results/, tsconfig.json.bak, vite.config.ts.bak
- Stashes: stash@{0}, stash@{1} (en main)
- No hay procesos de dev/build activos
- docs/audits/ no existía; se crea este log

## Ejecutado esta sesión (2026-10-25)
1. **P0 Dashboard — altura del gráfico**: `dashboard-chart.tsx` — `ResponsiveContainer height` 280→256 (el contenedor clampa a 260px max en desktop; el gráfico se cortaba). Verificado con build exit 0.
2. **P0 Dashboard — estado de carga**: `dashboard.tsx` — cuando `kpis===undefined` (sin error) ahora se renderiza un esqueleto "Cargando indicadores del negocio" en lugar de una pantalla vacía.
3. **P0 Dashboard — accesibilidad**: `dashboard.tsx` — `role="img"` + `aria-label` en el contenedor del gráfico; `role="status"` + `aria-label` en el fallback de carga del gráfico.
4. **P0 Dashboard — estilos carga**: `resumen-premium.css` — añadido `.nuva-resumen-loading` con centrado vertical, colores atenuados y `min-height:400px`.
5. **P0 Reproducibilidad**: `package.json` — `zod` ^3.24.0→^4.5.4 (TanStack router requiere ^4.5.4; package.json no cubría 4.x); añadido `typescript` ^5.6.2 a devDependencies (estaba en el lockfile y los peerDeps de eslint lo requieren, pero no estaba declarado).
6. **P0 Seguridad — auditoría estática**: Migraciones 120000 y 130000, pgTAP 099 leídas y verificadas estáticamente. Confirmado que 5 archivos frontend leen tablas people_* directamente desde el navegador y se romperán tras el endurecimiento RLS sin ajustes de consulta/RPC.
7. **P0 Seguridad — corrección TS**: `people-employees.tsx`, `people-attendance.tsx`, `people-compliance.tsx`, `people-lifecycle.tsx` — corregido `activeId: string | null` (cast a `string` dentro de `queryFn` guardado por `enabled: !!activeId`) y nombres de RPC no tipados (cast `(supabase as any).rpc("...")`). `people-lifecycle.tsx`: añadida importación faltante de `useQuery`. Corregido también RPC `people_vacation_balances_limited` que apuntaba erróneamente a `people_terminations_limited`.
8. **P0 Seguridad — reglas de hooks**: `people-payroll.tsx` — movido el `return` temprano de acceso restringido (no-owner/admin) **después** de todos los hooks para cumplir `react-hooks/rules-of-hooks`. Los hooks ahora se ejecutan incondicionalmente al inicio del componente; la verificación de rol solo controla el render.
9. **P0 Seguridad — migración 140000**: creada `supabase/migrations/20261025140000_people_operativo_limited_access_rpc.sql` con RPC `SECURITY DEFINER` (`people_employees_limited`, `people_contracts_limited`, `people_attendance_limited`, `people_compliance_items_limited`, `people_leave_requests_limited`, `people_terminations_limited`, `people_vacation_balances_limited`) que valida membresía de empresa y devuelve solo columnas no sensibles para staff/viewer.

## Verificaciones ejecutadas
- `npx tsc --noEmit` → PASS (exit 0)
- `npm test` → PASS (337/337, 86 archivos)
- `npm run build` → PASS (exit 0, despliegue nitro/vercel OK)
- `npm run lint` → 0 errores, 668 warnings (todos preexistentes)
- `git diff --check` → pendiente

## Ejecutado esta sesión (2026-10-25, continuación)
10. **P1 Dependencias — auditoría de vulnerabilidades**: `npm audit --audit-level=high` — 2 vulnerabilidades high: `zod <4.6.6` (agotamiento de memoria en colecciones grandes) y `happy-dom <21.0.4` (CVE-2026-33943, ejecución de código). Verificado que `node_modules` tiene zod 3.25.76 (vulnerable, desincronizado con package.json) y happy-dom 20.14.6 (vulnerable).
11. **P1 Dependencias — corrección zod**: `package.json` — `zod` ^4.5.4→^4.6.6 (excluye versiones vulnerables, npm resuelve 4.6.7). Verificado con `npm install --dry-run`: `change zod 3.25.76 => 4.6.7`.
12. **P0 Seguridad — consistencia frontend-RPC**: verificado que los 5 archivos people-* llaman exactamente los 7 RPC definidos en migración 140000 (`people_employees_limited`, `people_attendance_limited`, `people_leave_requests_limited`, `people_vacation_balances_limited`, `people_contracts_limited`, `people_compliance_items_limited`, `people_terminations_limited`). Todas las lecturas directas de tablas `people_*` desde el frontend están bajo patrón dual (owner/admin directo, staff/viewer vía RPC) o bloqueadas (payroll solo owner/admin).

## Verificaciones ejecutadas (continuación)
- `npm audit --audit-level=high` → 2 high encontradas, 1 corregida (zod), 1 documentada como WARN (happy-dom, requiere mayor 21 breaking change)
- `npx tsc --noEmit` → PASS (exit 0)
- `npm test` → PASS (337/337, 86 archivos)
- `npm run lint` → 0 errores, 668 warnings (mismo conteo preexistente, sin nuevos)

## Ejecutado esta sesión (2026-10-25, continuación — JARVIS)
13. **P2 Visual — Resumen tema claro premium**: `src/resumen-premium.css` reescrito completo a diseño claro (blanco perlado/gris claro, tarjetas blancas suaves, sombras discretas, acentos dorados e índigo) por referencia `origin/fix/resumen-light-glass-reference`, anulando tema oscuro V9 previo. Alcance scoped a `.nuva-resumen-canvas`. Añadidos estados de carga/error/sin-datos explícitos, accesibilidad (focus-visible, role/aria, prefers-reduced-motion), dimensionamiento de gráfico corregido (height clamp 245-370px), filtros y onboarding.
14. **P0 Release — commit y push**: commit `fe83a9d1` (11 archivos, +1191/-223) en rama `fix/resumen-fullscreen-dashboard-20261017`, push exitoso a `origin/fix/resumen-fullscreen-dashboard-20261017` (SHA remoto verificado coincide). `bun.lock` excluido del commit (inconsistencia zod 4.0.0 vs ^4.6.6, pendiente autorización para regenerar). PR #230 actualizado automáticamente; mergeStateStatus UNSTABLE (checks `verify` y `web-qa` fallaron en commit anterior `0928e8c6`; runs contra `fe83a9d1` aún no creados por GitHub).

## Verificaciones ejecutadas (esta sesión)
- `npx tsc --noEmit` → PASS (exit 0)
- `npm test` → PASS (337/337, 86 archivos)
- `npm run build` → PASS (exit 0, output .vercel/ generado)
- `npm run lint` → 0 errores, 668 warnings (preexistentes, sin nuevos)
- `git push origin fix/resumen-fullscreen-dashboard-20261017` → exit 0; `git ls-remote` confirma fe83a9d1 en remoto

## Plan restante actualizado
- P0 Reproducibilidad: `bun.lock` tiene zod 4.0.0 (inconsistente con package.json ^4.6.6); no se regenera por restricción de usuario. CI con npm reproducible (--dry-run exit 0). Pendiente: decisión de usuario sobre bun.lock o `npm install` para sincronizar node_modules local.
- P1 Dependencias: `happy-dom ^20.11.0` vulnerable (CVE-2026-33943); fix requiere mayor 21.0.4 (breaking change en entorno de tests). Documentado como WARN pendiente.
- P0 Seguridad: migraciones 120000/130000/140000 y pgTAP 099 preparadas localmente, no aplicadas remoto (pendiente autorización explícita).
- P1: Auditoría funcional módulos restantes, rendimiento, accesibilidad, mercado chileno.
