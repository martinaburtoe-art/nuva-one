# Evidencia de disponibilidad para demostracion empresarial - Nüva One

**Fecha:** 2026-11-07 (demo programada: 2026-11-09)
**Rama:** `integ/agency-272-274` (sincronizada con `origin/integ/agency-272-274`)
**Autor:** Hermes Agent (JARVIS, mano derecha de Don Martín)
**Estado general:** VERDE en codigo local; P0 restantes bloqueados por autorizacion de deploy/grants remotos (no se tocaron sin autorizacion)

---

## 1. Verificacion local (ejecutada y exitosa)

| Comando | Resultado | Estandar |
|---|---|---|
| `npm test` (vitest run) | 467 pruebas pasadas / 100 archivos, exit 0 | T-137 COMPLETADO |
| `npx tsc --noEmit` | exit 0 | T-138 COMPLETADO |
| `npm run build` (vite build --mode development) | exit 0, artefactos en `dist/` y `.vercel/output`, 5.16s | T-139 COMPLETADO |

Evidencia: salida de terminal de `npm test`, `npm run typecheck`, `npm run build` ejecutada el 2026-11-07 18:08-18:09 (hora local Chile, UTC-03). Ninguna prueba falla. Ningun error de tipo. Build produce artefactos desplegables.

---

## 2. Tareas de demostracion (backlog AGENT_BACKLOG.md)

| Tarea | Departamento | Prioridad | Estado | Nota |
|---|---|---|---|---|
| T-75 — Guion de demostracion para pyme chilena | Ventas | P2 | COMPLETADO | Guion adaptado a pyme chilena (ventas, inventario, finanzas, POS) |
| T-123 — Guion de demostracion para empresa piloto (basado en T-75) | Ventas | P1 | COMPLETADO | Flujos: login, dashboard, venta POS, inventario, Owner Console; sin datos de clientes reales |

Ambas tareas tienen evidencia de documento de guion en `docs/launch/`. No se repitieron auditorias ya certificadas.

---

## 3. Estado de GitHub (contrastado local vs remoto)

- Rama `integ/agency-272-274`: al día con `origin/integ/agency-272-274` (sin commits pendientes de subir ni de bajar).
- PR #252 `feat(agency): 13 especialistas y worker durable programable`: **MERGED**. Incluye 13 especialistas, control plane, Owner Console, worker durable, scheduler preparado, validacion de autorizacion.
- PR #278 `Autonomous engineering + RUT validation + env validator`: **ABIERTO** sobre `integ/agency-272-274`.
- Otros PR abiertos (#276, #270, #248, #247, ...) no afectan la rama objetivo; no se tocan archivos ajenos ni se reescribe historial.

Cambios locales no commiteados (conservados en rama):
- `docs/nuva-agency/AGENT_BACKLOG.md`: 1 linea (T-138 PENDIENTE → COMPLETADO).
- `logs/cycles/index.json`: +16 lineas (2 ejecuciones T-138, FAIL→PASS).
- Archivo sin seguir conservado: `docs/launch/.hermes-tmp.ZR3vft` (no eliminado).

---

## 4. Estado de Vercel (contrastado local vs remoto)

- Cuenta: `martinaburtoe-art` (verificado con `vercel whoami`).
- Proyecto: `martinaburtoe/nuva-one`.
- Despliegues: multiples Preview y Production con estado `Ready` (ultimos ~45 min). Build local genera artefactos compatibles con `.vercel/output/nitro.json`.
- No se hizo deploy a Produccion (requiere autorizacion; no se modifican datos de produccion).

---

## 5. Bloqueos reales de la demo (P0) — requieren autorizacion

Los siguientes P0 estan **BLOQUEADO** y dependen de autorizacion de deploy y/o grants remotos de Supabase (T-29). Conforme a instruccion, no se aplicaron migraciones remotas ni se desplego a produccion sin autorizacion.

| Tarea | Estado | Bloquea | Que se necesita para desbloquear |
|---|---|---|---|
| T-20 — Persistencia durable de Agency en Supabase | BLOQUEADO | T-21, T-27 | Grants remotos T-29 aplicados + autorizacion de deploy |
| T-21 — Scheduler durable | BLOQUEADO | T-27 | T-20 desbloqueado |
| T-27 — Recuperar ejecucion programada | BLOQUEADO | demo (worker) | T-20, T-21 desbloqueados |
| T-31 — Endurecer identidad OIDC worker legado | EN_CURSO | T-32 | Autorizacion de deploy de Edge Function |
| T-32 — Desplegar hardening OIDC | BLOQUEADO | demo (seguridad) | T-31 terminado + autorizacion de deploy |
| T-40 — Documentar permisos OIDC (T-31/T-32) | BLOCKED | T-49, T-50 | Autorizacion de deploy + grants remotos T-20 |
| T-49 / T-50 — Ciclos del orchestrator | BLOCKED | operacion continua | T-40 desbloqueado |

Recomendacion para Don Martín: solicitar autorizacion de deploy y aplicacion de grants remotos Supabase (T-29) para desbloquear T-20, T-21, T-27, T-32, T-40 antes del 2026-11-09.

---

## 6. Que NO se hizo (respetando restricciones)

- No se aplicaron migraciones remotas de Supabase.
- No se hizo deploy a Produccion de Vercel.
- No se modificaron datos de produccion.
- No se expusieron secretos, claves, tokens ni credenciales.
- No se borraron respaldos ni archivos de otros colaboradores.
- No se repitieron auditorias ya certificadas (CI, QA, compliance, security).
- No se reescribio historial de Git publicado.

---

## 7. Siguiente paso recomendado

Cuando Don Martín autorice: aplicar grants remotos Supabase (T-29), desplegar hardening OIDC (T-32), activar scheduler durable (T-20/T-21/T-27) y desplegar a Produccion para la demostracion del 2026-11-09.

Evidencia generada por Hermes Agent (JARVIS), 2026-11-07 18:10 UTC-03.
