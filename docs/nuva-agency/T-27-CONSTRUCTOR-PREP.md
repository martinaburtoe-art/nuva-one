# T-27 — Preparación Constructor (rama aislada, sin merge)

**Especialista:** Constructor
**Estado:** PREPARACIÓN (rama de trabajo aislada)
**Riesgo:** Bajo — solo rama de trabajo, sin merge, sin producción
**Autorización requerida:** No (rama aislada). Sí para merge y para aplicar T-20/T-21/T-31/T-32.

---

## 1. Objetivo de T-27 (bloqueada)

Recuperar la ejecución programada existente: el scheduler debe volver a reclamar y finalizar tareas nuevas, con resultado verificado en Supabase y Owner Console.

Dependencias de T-27: T-20 (grants service_role), T-21 (scheduler durable), T-31 (hardening OIDC), T-32 (despliegue Edge Function). Todas bloqueadas por falta de auth Supabase / autorización de deploy.

## 2. Qué prepara el Constructor en esta rama

Cambios de código que T-27 necesitará cuando se desbloqueen sus dependencias, preparados aquí sin tocar main ni producción:

- Revisar `scripts/agency-scheduler.mjs` (16,078 bytes): bucle de claim → execute → finish_task, lease, heartbeat, reintentos (maxAttempts 3, backoff 2s × intento), estado persistido en `logs/scheduler/state.json`.
- Revisar `scripts/agency-supervisor.mjs` (7,165 bytes): ciclo autónomo INSPECT → NEXT TASK, 132 ciclos, 2 reinicios, sin alertas.
- Revisar `scripts/agency-run-specialist.mjs`: ejecución individual de cada uno de los 13 especialistas (exit 0 verificado).
- Revisar `src/lib/agency/specialists.mjs`: 13 especialistas con `execute(task)`, `tiposDeTarea`, `herramientasPermitidas`, `límites`.
- Revisar `scripts/agency-certify-specialists.mjs`: FIX aplicado (commit 982123c3) — ahora invoca `SPECIALISTS[id](task)` en lugar de `fn(task)` indefinido. Certificación real: 8 PASS / 5 WARN / 0 FAIL / 0 BLOCKED.

## 3. Cambios de código propuestos (pendiente de revisión al desbloquear)

Cuando T-20/T-21/T-31/T-32 se autoricen, el Constructor evaluará:

1. Sincronizar `logs/scheduler/state.json` y `logs/cycles/` hacia Supabase (`agency_tasks`, `agency_events`, `agency_agent_leases`) para persistencia duradera remota.
2. Reemplazar el scheduler local de 5 min por el durable worker de GitHub Actions (`nuva-agent-durable-worker.yml`, cron `7,27,47 * * * *`) como ejecutor principal, manteniendo el local solo como respaldo.
3. Asegurar que `agency-run-specialist.mjs` y `agency-certify-specialists.mjs` reporten resultados al control plane remoto (`agency_claim_task`, `agency_heartbeat`, `agency_finish_task`) una vez los grants service_role estén aplicados.

## 4. Evidencia de esta sesión

- Rama `t-27-constructor-prep` creada desde `fix/reproducible-npm-ci-20261027`.
- Sin cambios en main, sin merge, sin producción tocada.
- 13 especialistas definidos y ejecutados individualmente (evidencia en `docs/launch/AGENCY_SPECIALIST_CERTIFICATION.json`).

## 5. Criterios para pasar T-27 a WORKING

- T-20 aplicado (grants service_role en Supabase remoto).
- T-21 desplegado (scheduler durable operativo).
- T-31 desplegado (hardening OIDC en Edge Function).
- T-32 desplegado (Edge Function `platform-telemetry`).
- Autorización de owner para merge de esta rama.

## 6. Reversión

Eliminar la rama `t-27-constructor-prep`; no afecta main ni producción.
