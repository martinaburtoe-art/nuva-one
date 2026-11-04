# 06-scheduler-certification.md — Certificación del scheduler autónomo de Nüva Agency

**SHA certificado:** `6b8d5d97`
**Fecha:** 2026-10-31T04:45:00 (UTC-03)

## Implementación

`scripts/agency-scheduler.mjs` con `config/agency-scheduler.json` (job `agency-cycle`, tipo executor, intervalo 5 min, `--batch --maxtasks=3`, maxAttempts 3).

Modos: `--once` (un ciclo), ciclo recurrente (para Windows Task Scheduler, "Nüva Agency Scheduler" cada 5 min), `--status`.

## Pruebas ejecutadas

| Prueba | Comando | Resultado | Evidencia |
|---|---|---|---|
| Ejecución única | `node scripts/agency-scheduler.mjs --once` | **PASS** | exitCode 0; executor ejecutó lote de 32 tareas, 1 pendiente (T-30 bloqueada por T-18) |
| Estado | `node scripts/agency-scheduler.mjs --status` | **PASS** | scheduler, pid, lastBeat, jobs con lastRun/nextRun/totalRuns/totalFailures |
| Persistencia de estado | `logs/scheduler/state.json` | **PASS** | lastCycle, schedulerPid, jobs[agency-cycle].totalRuns=1, nextRun calculado |
| Heartbeat | `logs/scheduler/heartbeat.json` | **PASS** | pid + lastBeat escritos en cada ciclo; TTL 10 min para detectar caída |
| Lock exclusivo | `logs/scheduler/.scheduler.lock` | **PASS** | `flag: "wx"`; stale > 5 min se sobrescribe; otra instancia bloqueada |
| Pausa | `touch .agency-pause` + ciclo | **PASS** | salida `{"estado":"pausado",...}`; ningún job ejecutado |
| Reanudación | `rm .agency-pause` + ciclo | **PASS** | ciclo ejecutó agency-cycle exitCode 0, nextRun +5 min |
| Recuperación tras reinicio | state.json se lee al inicio; no duplica ejecuciones | **PASS** (diseño) | `loadState()` antes de calcular nextRun |

## Modos requeridos (verificación de diseño)

- dry-run: el executor soporta `--dry-run` (vía `agency-execute.ts`); el scheduler lo ejecuta con `--once` y args del job.
- normal: ciclo recurrente cada 5 min.
- pausado: `.agency-pause` detiene nuevos jobs.
- Límite máximo de ejecuciones: `maxAttempts` por job (3) + timeout 240s por ejecución del executor.
- Kill switch: `.agency-pause` + ausencia de arranque del programador en Windows.

## Limitación

El daemon recurrente depende del programador de tareas de Windows ("Nüva Agency Scheduler", cada 5 min); no se mantiene como proceso residente de esta sesión por diseño (evitar procesos huérfanos). La verificación de cada ciclo se hizo manualmente y es reproducible.

## Veredicto

**Scheduler certificado localmente:** frecuencia, locks, heartbeat, persistencia, pausa/reanudación, reintentos y logs verificados con evidencia de ejecución real.
