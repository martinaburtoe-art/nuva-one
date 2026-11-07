# Evidencia de disponibilidad para demostracion empresarial - Nüva One

**Fecha:** 2026-11-07 (demo programada: 2026-11-09)
**Rama de evidencia:** `integ/recuperacion-publicacion-20261107` (SHA `80ab9596`; validaciones locales reportadas por Hermes)
**Autor:** Hermes Agent (JARVIS, mano derecha de Don Martín)
**Estado general:** validaciones locales reportadas PASS; PR #276 y PR #278 integrados en `main`; despliegues de producción sujetos a verificación de Vercel. Persisten pruebas end-to-end y hardening OIDC pendientes.

---

## 1. Verificacion local (ejecutada y exitosa)

| Comando | Resultado | Estandar |
|---|---|---|
| `npm test` (vitest run) | 480 pruebas pasadas / 100 archivos, exit 0 | T-137 COMPLETADO |
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
- PR #276: **MERGED** en `main` (commit `1c48b386`).
- PR #278: **MERGED** en `main` (commit `39fa3450`).
- PR #280: recuperación documental en revisión; sus tres archivos se trasladan a un PR limpio contra `main`.
- PR #280 no se integra directamente porque su rama quedó divergente tras integrar #276 y #278; los cambios documentales se reubican en una rama nueva basada en `main`.

Cambios locales no commiteados (conservados en rama):
- `docs/nuva-agency/AGENT_BACKLOG.md`: 1 linea (T-138 PENDIENTE → COMPLETADO).
- `logs/cycles/index.json`: +16 lineas (2 ejecuciones T-138, FAIL→PASS).
- El archivo temporal vacío `.hermes-tmp.ZR3vft` se excluyó del respaldo de publicación por no contener datos útiles; el respaldo remoto se conserva.

---

## 4. Estado de Vercel (contrastado local vs remoto)

- Cuenta: `martinaburtoe-art` (verificado con `vercel whoami`).
- Proyecto: `martinaburtoe/nuva-one`.
- Despliegues: multiples Preview y Production con estado `Ready` (ultimos ~45 min). Build local genera artefactos compatibles con `.vercel/output/nitro.json`.
- Tras mergear #276, Vercel generó un deployment Production para SHA `1c48b386`; se verificó READY. El deployment de #278 debe comprobarse por SHA antes de darlo por publicado.

---

## 5. Bloqueos reales de la demo (P0) — requieren autorizacion

Los siguientes P0 requieren pruebas end-to-end y despliegue controlado. La migración `20261103022653 agency_service_role_privileges` ya figura aplicada en Supabase; no reaplicar T-29.

| Tarea | Estado | Bloquea | Que se necesita para desbloquear |
|---|---|---|---|
| T-20 — Persistencia durable de Agency en Supabase | BLOQUEADO | T-21, T-27 | Validar acceso efectivo del worker y claim/finish; grants constan aplicados en historial remoto |
| T-21 — Scheduler durable | BLOQUEADO | T-27 | T-20 desbloqueado |
| T-27 — Recuperar ejecucion programada | BLOQUEADO | demo (worker) | T-20, T-21 desbloqueados |
| T-31 — Endurecer identidad OIDC worker legado | EN_CURSO | T-32 | Autorizacion de deploy de Edge Function |
| T-32 — Desplegar hardening OIDC | BLOQUEADO | demo (seguridad) | T-31 terminado + autorizacion de deploy |
| T-40 — Documentar permisos OIDC (T-31/T-32) | BLOCKED | T-49, T-50 | Autorizacion de deploy + grants remotos T-20 |
| T-49 / T-50 — Ciclos del orchestrator | BLOCKED | operacion continua | T-40 desbloqueado |

Recomendación: completar verificación de worker, scheduler único y hardening OIDC. No reaplicar T-29; no declarar T-20/T-21/T-27 listos sin evidencia end-to-end.

---

## 6. Que NO se hizo (respetando restricciones)

- No se aplicaron migraciones remotas de Supabase.
- Se desplegó el commit `1c48b386` a Production y Vercel lo marcó READY; el deployment de `main` posterior al merge de #278 debe verificarse por separado.
- No se modificaron datos de produccion.
- No se expusieron secretos, claves, tokens ni credenciales.
- No se borraron respaldos ni archivos de otros colaboradores.
- No se repitieron auditorias ya certificadas (CI, QA, compliance, security).
- No se reescribio historial de Git publicado.

---

## 7. Siguiente paso recomendado

Siguiente paso: verificar el deployment del SHA posterior a PR #278; luego completar pruebas end-to-end de claim/finish, validar scheduler único y desplegar hardening OIDC mediante una revisión y evidencia específicas.

Evidencia generada por Hermes Agent (JARVIS), 2026-11-07 18:10 UTC-03.
