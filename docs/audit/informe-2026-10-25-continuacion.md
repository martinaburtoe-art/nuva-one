# Informe de auditoría Nüva One — 2026-10-25 (continuación)

**Repositorio:** `C:/Users/marti/Documents/nuva-one`
**Rama:** `fix/resumen-fullscreen-dashboard-20261017`
**HEAD:** `0928e8c6`
**Fecha:** 25 de octubre de 2026 (Chile, UTC-03)

---

## 1. Estado inicial del repositorio

Verificado con `git status --short --branch`, `git branch --show-current`, `git rev-parse HEAD`, `git log -5 --oneline --decorate`, `git stash list`:
- HEAD confirmado: `0928e8c6`
- Rama: `fix/resumen-fullscreen-dashboard-20261017`
- 2 stashes preservados (no tocar)
- 8 archivos modificados sin commit + archivos nuevos no rastreados (`.gitignore`, `bun.lock`, `routeTree.gen.ts`, `.bak`) sin investigar función aún
- Sin commits, pushes, merges ni despliegues durante esta sesión

Cambios de sesión anterior vigentes (sin revertir):
- `src/routes/_authenticated/pos.tsx` — fecha local `today`, `checkout()` con `toast.error`, validación stock
- `src/routes/_authenticated/sales.tsx` — import `toast`, try/catch en `onSubmit`; **líneas 467-478 pendientes de este reporte** (ver §3)
- `package.json` — override `dompurify` 3.4.16 → 3.4.17
- `src/lib/finance-period.ts` — `parseLocalISO()`
- `src/resumen-premium.css` — regla `status-light`
- `src/routes/_authenticated/dashboard.tsx` — parches zona horaria
- `src/routes/_authenticated/people-employees.tsx` — `todayLocal()` para `hire_date` y `blankContract.start_date`
- `src/lib/biz-data.ts` — `toast.error` en errores de lectura RLS de `people_*`
- `supabase/migrations/20261025120000_people_payroll_owner_admin_select_hardening.sql` — preparada, NO aplicada
- `supabase/tests/database/099_people_rls_hardening.sql` — creado, no ejecutado localmente

---

## 2. Hallazgos confirmados y descartados

### Confirmados (P0)
1. **Vulnerabilidad XSS crítica dompurify 3.4.16** → corregida a 3.4.17 (override en package.json). `npm audit --audit-level=moderate` exit 0. 5 vulnerabilidades restantes son todas dev/transitivas (happy-dom, zod, @vitest/mocker), bloqueadas por EBUSY de Windows en rolldown `.node` y por falta de autorización para `--force`.
2. **Falta manejo de errores en cambio de estado de venta** (`sales.tsx` líneas 467-478): `<select>` de estado usa `upd.mutate` sin try/catch; cambiar a `paid`/`pending` desde la tabla dispara `sync_sale_effects()` (trigger `SECURITY DEFINER`) sin retroalimentación al usuario si falla.
3. **RPC `people_dashboard_summary` invocada en `people.tsx`** sin evidencia de que exista en Supabase; requiere verificación remota (bloqueado: no sesión autenticada).
4. **Migración RLS `20261025120000` preparada pero no aplicada** — 10 tablas `people_*` endurecidas; pendiente de despliegue remoto autorizado.
5. **`sync_sale_effects()` es `SECURITY DEFINER` con `search_path=public`** — decrementa stock solo si `status IN ('paid','pending') AND NOT stock_applied`. Posible doble descuento si `create_fast_sale` + trigger ambos actúan.

### Descartados
- La migración RLS `20261025120000` está bien formada e idempotente; todas las tablas `people_*` tienen `business_id`; `private.has_business_role` existe; `search_path=public`; vistas `security_invoker=true`; no hay vistas que salteen RLS.
- Build, TypeScript y pruebas ya estaban verdes antes de esta sesión; se mantienen verdes tras los cambios.

---

## 3. Cambios aplicados (esta sesión)

| Archivo | Cambio | Problema resuelto | Comando | Código de salida | Resultado |
|---------|--------|-------------------|---------|------------------|-----------|
| `src/routes/_authenticated/sales.tsx` | `<select>` de estado usa `upd.mutateAsync` con `try/catch`, `toast.success` y `toast.error` | Cambio de estado a `paid`/`pending` sin manejo de error ni retroalimentación | `npx tsc --noEmit`, `npm test`, `npm run build` | 0, 0, 0 | Verde |
| `src/lib/sales-inventory-regression.test.ts` | Nuevo archivo: 14 pruebas de regresión pura (cálculo total, validación stock, transiciones de estado, fmtCLP) | Ausencia de pruebas de ventas/inventario | `npm test` | 0 | 322/322 PASS (85 archivos) |

Detalles del cambio en `sales.tsx`:
```tsx
onChange={async (e) => {
  try {
    await upd.mutateAsync({ id: s.id, patch: { status: e.target.value } });
    toast.success("Estado de venta actualizado");
  } catch (error: any) {
    toast.error(error?.message ?? "No se pudo cambiar el estado de la venta");
  }
}}
```
No se agregó validación de stock en el frontend (evita duplicar el trigger `sync_sale_effects` existente).

---

## 4. Pruebas antes y después

| Suites | Antes (sesión previa) | Después (esta sesión) |
|--------|----------------------|----------------------|
| `npm test` | 308/308 PASS (84 archivos) | 322/322 PASS (85 archivos) — +14 pruebas de regresión ventas/inventario |
| `npx tsc --noEmit` | exit 0 | exit 0 |
| `npm run build` | exit 0 | exit 0 |

Las 14 pruebas nuevas cubren: cálculo total de carrito (3 casos), validación de stock (5 casos), transiciones de estado de venta (4 casos), formato CLP (2 casos).

---

## 5. Vulnerabilidades corregidas y pendientes

### Corregidas
- **dompurify XSS crítica** (GHSA-cg2g-xh64-v4q7): 3.4.16 → 3.4.17 vía override en `package.json`. Verificada con `npm audit --audit-level=moderate` exit 0.

### Pendientes (no aplicadas por bloqueo de entorno)
- 5 vulnerabilidades dev/transitivas: `happy-dom`, `zod`, `@vitest/mocker` (y relacionadas). `npm audit fix` bloqueado por EBUSY de Windows en `rolldown .node`. Requieren `--force` (sin autorización) o intervención de entorno. Todas son de desarrollo, no expuestas en producción.

---

## 6. Estado de migraciones

| Migración | Estado | Aplicada remota |
|-----------|--------|-----------------|
| `20260920010000_fix_sale_purchase_effect_lifecycle.sql` | Presente en Git | No confirmado |
| `20260920024000_harden_fast_sale_available_stock.sql` | Presente en Git | No confirmado |
| `20261025120000_people_payroll_owner_admin_select_hardening.sql` | Preparada, idempotente | **NO aplicada** (prohibido sin autorización) |

Migración RLS `20261025120000`: endurece SELECT en 10 tablas `people_*` (solo owner/admin ven remuneraciones, contratos, documentos, LRE). Listo para despliegue remoto autorizado.

---

## 7. Estado de RLS y aislamiento multiempresa

- Todas las tablas `people_*` tienen `business_id` (verificado en migraciones y 25 archivos src).
- `private.has_business_role` existe (1 match en supabase).
- `search_path = public` en funciones; vistas usan `security_invoker=true`.
- No hay vistas que salteen RLS.
- `people.tsx` invoca RPC `people_dashboard_summary` cuya existencia en BD no está verificada — requiere acceso de solo lectura a Supabase (bloqueado: sin sesión autenticada).
- `people-payroll.tsx` y `people-employees.tsx` leen tablas `people_*` directamente desde el navegador; si se aplica la migración RLS, usuarios no-owner/admin verán listas vacías o errores (mitigado por `toast.error` en `biz-data.ts`).

---

## 8. Estado de ventas e inventario

| Flujo | Estado |
|-------|--------|
| POS `checkout()` | Validación de stock previa + `toast.error` en catch (verificado) |
| `sales.tsx` `onSubmit()` | try/catch con `toast.error` (verificado) |
| `sales.tsx` cambio de estado `<select>` | **Corregido esta sesión**: `mutateAsync` + try/catch + toast |
| Trigger `sync_sale_effects()` | Existe en migración Git; `SECURITY DEFINER`; descuenta stock si `status IN ('paid','pending') AND NOT stock_applied`; no confirmado desplegado en Supabase remoto |
| `create_fast_sale()` RPC | Existe; POS usa `insert.mutateAsync()` directo, no la RPC |
| Riesgo residual | Doble descuento si `create_fast_sale` y el trigger actúan sobre la misma venta; cambios de estado desde lista de ventas sin validación de stock previa |

---

## 9. Métricas de rendimiento (referencia previa, no re-mesida)

- JS acumulado: ~4,824 KB; CSS: ~275 KB; MP4s: ~21,555 KB; total estático: ~26 MB
- Chunks: ExcelJS 907 KB, escáner códigos barras 425 KB, jsPDF ~537 KB, Recharts `generateCategoricalChart` 358 KB
- Build actual: exit 0 (output .vercel/output generado)

No se re-mesió en esta sesión (prioridad P1 pendiente).

---

## 10. Bloqueos de autenticación o entorno

- **Browser (`browser_exec`)**: inoperante con timeouts de IPC intermitentes. No se pueden capturar evidencias visuales del dashboard autenticado.
- **Supabase**: no hay sesión autenticada; `/dashboard` redirige a `/auth` vía `beforeLoad` en `route.tsx`. No se puede verificar si `sync_sale_effects()` ni `people_dashboard_summary` están desplegados en el proyecto `vnzyecnbdqbfuxawzrda`.
- **npm audit fix**: bloqueado por EBUSY de Windows en `rolldown .node` (problema de entorno, no de código).
- **pgTAP**: no hay runner `pg_prove` configurado localmente (búsqueda = 0 matches); tests 095-099 existen pero no se ejecutaron.
- **Login manual requerido**: `http://127.0.0.1:5173/auth?mode=signup` con credenciales reales de Supabase, luego navegar a `/dashboard`.

---

## 11. Riesgos que todavía impiden el lanzamiento

| Riesgo | Prioridad | Estado | Qué falta |
|--------|-----------|--------|-----------|
| RLS Nüva People no aplicada en BD remota | P0 | Preparada localmente | Despliegue remoto autorizado de `20261025120000` |
| Vulnerabilidades dev/transitivas sin resolver | P0 (bajo riesgo producción) | Bloqueadas por EBUSY | `--force` autorizado o intervención de entorno |
| `sync_sale_effects()` no confirmado desplegado | P0 | Código en Git, BD desconocida | Verificación remota de solo lectura |
| Doble descuento stock (`create_fast_sale` + trigger) | P0 | Documentado | Revisión de arquitectura de escritura de ventas |
| `people_dashboard_summary` RPC no verificada | P1 | Invocada en `people.tsx` | Acceso de solo lectura a Supabase |
| Onboarding sin RUT/SII chileno | P1 | Sin implementar | Diseño de modelo tributario local |
| Métricas de rendimiento no re-mesidas | P1 | Referencia previa | Build con análisis de chunks |

---

## 12. Siguientes acciones ordenadas por prioridad

**P0**
1. Solicitar autorización para desplegar migración RLS `20261025120000` en Supabase remoto (proyecto `vnzyecnbdqbfuxawzrda`).
2. Solicitar acceso de solo lectura a Supabase para verificar despliegue de `sync_sale_effects()` y existencia de `people_dashboard_summary`.
3. Solicitar autorización para `npm audit fix --force` o intervención de entorno para EBUSY en `rolldown .node`.
4. Revisar arquitectura de escritura de ventas para evitar doble descuento de stock entre `create_fast_sale` y trigger `sync_sale_effects`.

**P1**
5. Login manual en `/auth?mode=signup` y navegación a `/dashboard` para verificar visualmente Resumen.
6. Implementar onboarding con RUT, razón social, giro, régimen tributario, IVA (datos locales, sin afirmar integración SII).
7. Re-medir métricas de rendimiento y evaluar carga diferida de MP4, ExcelJS, jsPDF.

**P2**
8. Corregir 23 `setState` síncrono en `useEffect` y promesa flotante en `foro/$topicId.tsx:63`.
9. Verificar componentes supuestamente muertos antes de eliminar.

---

**Estado general:** Build, TypeScript y pruebas verdes. P0 crítico (RLS, integridad stock, XSS) parcialmente cerrado localmente; pendiente de operaciones remotas autorizadas. No se realizaron commits, pushes, merges, despliegues ni cambios en BD remota.
