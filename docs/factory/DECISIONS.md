# DECISIONS.md — Nüva One Factory

Registro de decisiones técnicas con identificador, fecha, estado, justificación, evidencia, consecuencias y condiciones de revisión. Ninguna decisión atribuye al usuario aprobaciones que no haya dado explícitamente.

---

## D-001 — Integridad reproducible de dependencias

- **ID:** D-001
- **Fecha:** 2026-10-29
- **Estado:** APPROVED (estrategia actual); decisión definitiva pendiente de evaluación de usuario
- **Justificación:** El proyecto usa `npm` como gestor de paquetes (`package.json` + `package-lock.json` versiónados). Existe un `bun.lock` no versionado/conflictivo que no debe regenerarse ni reemplazarse sin evaluar impacto, reproducibilidad y CI.
- **Evidencia:** `package.json` (gestor npm), `package-lock.json` presente, `bun.lock` presente pero sin cambios confirmados de gestor. PR #252 CI 11/11 PASS con npm.
- **Consecuencias:** No se cambia a Bun ni se regenera `bun.lock` sin decisión explícita del usuario y verificación de CI. Cualquier cambio de gestor requiere revalidación completa de `npm ci`, typecheck, tests y build.
- **Condiciones de revisión:** Si el usuario decide migrar a Bun, reevalúe D-001 con evidencia de CI verde en el nuevo gestor.

---

## D-002 — Entorno de pruebas

- **ID:** D-002
- **Fecha:** 2026-10-29
- **Estado:** APPROVED
- **Justificación:** Los tests React/DOM necesitan `happy-dom` (scoped), mientras que los tests de servidor/node conservan el entorno `node` por defecto. La configuración real verificada en `vitest.config.ts` usa `environment: "node"` con include `*.test.ts` + `*.test.tsx`; `biz-data.test.tsx` anota `// @vitest-environment happy-dom`.
- **Evidencia:** `vitest.config.ts` leído; `package.json` devDependencies tiene `happy-dom: ^21.0.4`; versión instalada 21.0.4; `npm test` 351/351 PASS.
- **Consecuencias:** No se cambia el entorno global a happy-dom. Los tests que necesitan DOM usan la anotación por archivo. Se mantiene `npm test` como puerta de calidad.
- **Condiciones de revisión:** Si se añaden tests de componentes React que requieren DOM, extender `happy-dom` scoped por archivo, no globalmente.

---

## D-003 — Aislamiento multiempresa

- **ID:** D-003
- **Fecha:** 2026-10-29
- **Estado:** APPROVED
- **Justificación:** Las operaciones de negocio deben validar el negocio activo, y las mutaciones deben quedar acotadas por empresa cuando corresponda. Implementado en `src/lib/biz-data.ts` (`useBizDelete`/`useBizUpdate` con guardia `active` y filtro `business_id`), `src/lib/use-business.ts` (`useActiveBusiness` sin auto-fallback, `useMyMembership` con `businessId=activeId`), y `src/routes/_authenticated/settings.tsx` (`deleteBusiness` con guardia `isOwner`).
- **Evidencia:** Archivos modificados y commitidos (`edbbce07`, `b0656810`, `921fb2d6`); `biz-data.test.tsx` 8/8 PASS con mutación testing.
- **Consecuencias:** Cualquier nueva mutación de negocio debe incluir filtro `business_id` y guardia de negocio activo. No se permite auto-fallback de negocio activo.
- **Condiciones de revisión:** Si se añade un nuevo módulo de mutación, revisar que use `biz-data` con guardia y filtro `business_id`.

---

## D-004 — Seguridad en servidor

- **ID:** D-004
- **Fecha:** 2026-10-29
- **Estado:** APPROVED
- **Justificación:** Los filtros del cliente no sustituyen las políticas RLS, las restricciones de base de datos ni la validación de autorización en RPC. Verificado en los 4 RPC críticos auditados (Fase 4 de esta sesión):
  - `deleteShift`: RLS en `public.shifts` restringe DELETE a `has_business_role(business_id, auth.uid(), [owner, admin])`.
  - `convert_quote_to_sale`: SECURITY INVOKER, business derivado de `quotes.business_id`, `has_business_role` verificado.
  - `finalize_inventory_stocktake`: SECURITY DEFINER con `search_path` controlado, business derivado de `inventory_stocktakes`, `FOR UPDATE`, `has_business_role` verificado.
  - `create_fast_sale`: SECURITY INVOKER, business derivado de `business_members` del usuario autenticado, stock bloqueado y verificado por fila.
- **Evidencia:** Migraciones `20260715000000_shifts_module.sql`, `20260920044000_secure_quote_conversion.sql`, `20260819123000_inventory_stocktake_atomic_finalize_v2.sql`, `20260920024000_harden_fast_sale_available_stock.sql` leídas y verificadas.
- **Consecuencias:** Los hallazgos P2 de T-08 se downgradean a P3 (defense-in-depth, no vulnerabilidad). No se aplican cambios de RLS remota sin autorización.
- **Condiciones de revisión:** Si se añade un nuevo RPC o mutación, revisar que derive el negocio en servidor y valide `has_business_role` antes de escribir.

---

## D-005 — Integridad de inventario y ventas

- **ID:** D-005
- **Fecha:** 2026-10-29
- **Estado:** APPROVED
- **Justificación:** Las comprobaciones de stock en cliente mejoran la experiencia, pero la integridad concurrente debe garantizarse en el servidor. Verificado en `create_fast_sale` (`FOR UPDATE` en `public.products`, validación de `available_qty >= qty`), `apply_sale_effects` (trigger que actualiza stock con condición `greatest(0, stock-reserved_stock-blocked_stock) >= qty_needed`), y `finalize_inventory_stocktake` (locking de producto y stocktake, validación de stock negativo).
- **Evidencia:** Migración `20260920024000_harden_fast_sale_available_stock.sql` y `20260819123000_inventory_stocktake_atomic_finalize_v2.sql` leídas.
- **Consecuencias:** No se confía únicamente en validación de stock del cliente. Toda mutación de inventario pasa por server-side locking y validación.
- **Condiciones de revisión:** Si se añade un nuevo flujo de venta o ajuste de stock, verificar que use `FOR UPDATE` y validación de disponibilidad en servidor.

---

## D-006 — Política de releases

- **ID:** D-006
- **Fecha:** 2026-10-29
- **Estado:** APPROVED
- **Justificación:** PR #252 permanece abierto y no se fusiona ni despliega a producción sin autorización explícita del usuario. Commits, PR y despliegues son acciones distintas.
- **Evidencia:** `gh pr checks 252` → 10/10 PASS; PR #252 abierto, sin merge; rama `fix/reproducible-npm-ci-20261027` @ `226241fe` publicada en origen.
- **Consecuencias:** No se hace `git merge` a `main`, no se despliega a producción, no se aplica `vercel --prod` sin autorización explícita del usuario.
- **Condiciones de revisión:** Solo cambia si el usuario autoriza explícitamente merge o deploy.

---

## D-007 — Evidencia

- **ID:** D-007
- **Fecha:** 2026-10-29
- **Estado:** APPROVED
- **Justificación:** Ningún estado PASS puede basarse únicamente en documentación, código aparentemente correcto o resultados históricos. Cada afirmación de calidad debe estar respaldada por salida real de herramienta (typecheck, lint, vitest, build, gh pr checks).
- **Evidencia:** Esta sesión ejecuta `npm run typecheck` (0 errores), `npm run lint` (0 errores), `npm test` (351/351 PASS), `npm run build` (PASS), `gh pr checks 252` (10/10 PASS).
- **Consecuencias:** Los informes de salida incluyen comandos ejecutados y sus salidas reales. No se declaran tareas completas sin evidencia verificable.
- **Condiciones de revisión:** Aplica a todas las tareas de la Factory de forma permanente.

---

## D-008 — Nüva Agency: prioridad estratégica y arquitectura

- **ID:** D-008
- **Fecha:** 2026-10-29
- **Estado:** APPROVED
- **Justificación:** Construir Nüva Agency (equipo operativo de agentes especializados dentro de Nüva One) es la prioridad estratégica a corto plazo. Prevalece sobre tareas secundarias de mantenimiento salvo bloqueo crítico de seguridad o integridad. Arquitectura: Orquestador, Finanzas, Ventas, Abastecimiento, Personas, Cumplimiento y Crecimiento, con QA y Seguridad independientes.
- **Evidencia:** `docs/NUVA_AGENCY_ARCHITECTURE.md`, `docs/nuva-agency/CONSTRUCTION_AGENT.md`, `docs/nuva-agency/AGENT_BACKLOG.md` (T-01), `scripts/agency-select-next-task.mjs` (T-02).
- **Consecuencias:** Las tareas de Agency se seleccionan desde el backlog por el orquestador; ninguna tarea toca producción, migraciones remotas ni RLS sin autorización explícita.
- **Condiciones de revisión:** Reevaluar si aparece un bloqueo crítico de seguridad o integridad.

---

## D-009 — Nüva Agency: anti-self-certification

- **ID:** D-009
- **Fecha:** 2026-10-29
- **Estado:** APPROVED
- **Justificación:** Ningún agente debe poder declarar su propio trabajo aprobado sin verificación independiente. Cada ciclo de Agency requiere un revisor distinto al ejecutor.
- **Evidencia:** `docs/nuva-agency/CERTIFICATION_MATRIX.md`, `AGENTS.md`, T-05 (revisión independiente de T-04).
- **Consecuencias:** El ejecutor de una tarea no puede marcarla como COMPLETADA sin un veredicto de revisión independiente (APROBADO/RECHAZADO).
- **Condiciones de revisión:** Se aplica a todas las tareas del ciclo de Agency.

---

## D-010 — Nüva Agency: backlog como fuente de verdad del orquestador

- **ID:** D-010
- **Fecha:** 2026-10-29
- **Estado:** APPROVED
- **Justificación:** `docs/nuva-agency/AGENT_BACKLOG.md` es el backlog único de tareas operativas. El orquestador selecciona siempre la primera tarea con estado=PENDIENTE y dependencias resueltas, ordenada por prioridad.
- **Evidencia:** `docs/nuva-agency/AGENT_BACKLOG.md`, `scripts/agency-select-next-task.mjs` (T-02).
- **Consecuencias:** El orquestador no inventa tareas fuera del backlog. Cada tarea ejecutada debe tener entrada en el backlog con criterios de aceptación y pruebas requeridas.
- **Condiciones de revisión:** Si se añade un nuevo tipo de tarea, actualizar el formato del backlog.

---

## D-011 — Nüva Agency: límites de seguridad y autonomía

- **ID:** D-011
- **Fecha:** 2026-10-29
- **Estado:** APPROVED
- **Justificación:** Nüva Agency opera dentro de los límites existentes de Nüva One Factory: sin despliegues de producción, sin migraciones remotas, sin cambios de RLS, sin acciones destructivas, sin exposición de secretos, sin merge a `main` sin autorización explícita.
- **Evidencia:** `docs/factory/ORCHESTRATOR.md` (reglas de seguridad), `docs/factory/DECISIONS.md` (D-006, D-007), `AGENT_POLICY.md` (never-grant list).
- **Consecuencias:** Ningún agente de Agency puede ejecutar mutaciones de producción, cambios de RLS o migraciones remotas. Todas las tareas de Agency son locales, reversibles y verificables.
- **Condiciones de revisión:** Solo cambia con autorización explícita del usuario.

---

### Índice de estados

| ID | Título | Estado |
|---|---|---|
| D-001 | Integridad reproducible de dependencias | APPROVED (definitiva pendiente) |
| D-002 | Entorno de pruebas | APPROVED |
| D-003 | Aislamiento multiempresa | APPROVED |
| D-004 | Seguridad en servidor | APPROVED |
| D-005 | Integridad de inventario y ventas | APPROVED |
| D-006 | Política de releases | APPROVED |
| D-007 | Evidencia | APPROVED |
| D-008 | Nüva Agency: prioridad estratégica y arquitectura | APPROVED |
| D-009 | Nüva Agency: anti-self-certification | APPROVED |
| D-010 | Nüva Agency: backlog como fuente de verdad del orquestador | APPROVED |
| D-011 | Nüva Agency: límites de seguridad y autonomía | APPROVED |
