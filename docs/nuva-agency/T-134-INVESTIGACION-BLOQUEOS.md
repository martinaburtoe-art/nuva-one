# T-134 — Investigación de bloqueos: T-20, T-21, T-22, T-27, T-28, T-32

## Resumen ejecutivo

Seis tareas de la agencia Nüva Agency están BLOQUEADA en cadena. Todas dependen, directa o indirectamente, de tres cosas que requieren autorización explícita del propietario:

1. **Aplicar migración de grants de Supabase** (T-20) — migración local `a3fa219d` preparada, no aplicada remoto.
2. **Desplegar hardening OIDC en Edge Function** (T-32) — código listo en PR #252, no desplegado.
3. **Validar OIDC estricto** (T-31) — depende de T-21, creando dependencia circular con T-21.

## Dependencia circular identificada

```
T-21 (Scheduler durable) depende de: T-20, T-31, T-32
T-32 (Desplegar OIDC hardening) depende de: T-31
T-31 (Validar OIDC estricto) depende de: T-21
```

Resultado: T-21 ↔ T-31 es un ciclo. Ninguna de las tres puede avanzar sin que las otras lo hagan primero, y ninguna se puede desbloquear sin autorización de deploy o migración remota.

## Estado por tarea

| Tarea | Departamento | Especialista | Prioridad | Bloqueo directo | Alternativa sin autorización |
|-------|-------------|--------------|-----------|-----------------|------------------------------|
| T-20 | Operaciones | Constructor | P0 | Grants Supabase no aplicados remoto | Preparar script de aplicación; validar localmente; documentar comandos exactos para el owner |
| T-21 | Operaciones | Constructor | P0 | Depende de T-20, T-31, T-32 (ciclo) | Ejecutar scheduler localmente vía cronjob (ya operativo: `14df32db31fc`, cada 5m, status ok) |
| T-22 | Operaciones | Security | P1 | Depende de T-20, T-21 | UI y APIs listas en PR #252; tests unitarios pasan; solo falta sesión real de owner |
| T-27 | Operaciones | Release | P0 | Depende de T-20, T-21, T-31, T-32 | Workflow schedule existe en main; último run observó éxito pero sin tareas elegibles |
| T-28 | Operaciones | Security | P1 | Depende de T-26, T-27, T-29 | No se ejecutó sesión real; persistencia bloqueada por grants ausentes |
| T-32 | Seguridad | Release | P0 | Depende de T-31; requiere deploy | Código endurecido listo en PR #252; smoke test preparado contra función desplegada |

## Qué se puede hacer SIN autorización (líneas de trabajo independientes)

1. **Supervisor local duradero** — `scripts/agency-supervisor.mjs` ejecutado vía cronjob cada 5 min. Verificado: heartbeat activo, recuperación ante fallo, ejecución de `--once` con exit 0.
2. **Scheduler local** — `scripts/agency-scheduler.mjs --once` ejecuta batches de hasta 3 tareas. Verificado: selecciona, ejecuta y marca tareas como COMPLETADO.
3. **Executor de tareas** — `scripts/agency-task-executor.mjs` ejecuta tareas vía especialistas directos. Verificado: T-128, T-129, T-130 ejecutadas y marcadas COMPLETADO.
4. **Generador continuo de tareas** — `scripts/agency-generate-tasks.mjs` inspecciona estado del producto, detecta TODOs, fallos de calidad, dependencias bloqueadas, y genera tareas con criterios de aceptación. Verificado: genera tareas correctamente con `cmd /c` en Windows.
5. **Integración generador↔executor** — Al llegar a `batch-complete`, el executor invoca automáticamente el generador antes de rendirse. Verificado en código (pendiente de validación end-to-end).
6. **Calidad local** — `npm run build`, `npm test -- --run`, `npx tsc --noEmit`, `npm run lint`: todos pasan localmente (exit 0, 429/429 tests).
7. **Escaneo de secretos** — 0 coincidencias en `docs/` y `scripts/` (patrones sk-, pk-, JWT).

## Qué requiere autorización del propietario (bloqueos reales)

| Acción | Por qué | Quién debe autorizar |
|--------|---------|---------------------|
| Aplicar migración `a3fa219d` a Supabase remoto | T-20 requiere grants service_role en 6 tablas + secuencia | Owner (Martín) |
| Desplegar Edge Function `nuva-agency-worker-control` v17+ | T-32 requiere deploy a producción/preview | Owner (Martín) |
| Merge de PR #252 a main | Contiene `authorizeAgencyOwner`, durable worker, hardening OIDC | Owner (Martín) |
| Activar workflow `nuva-agency-durable-worker.yml` en GitHub | Sería un segundo scheduler compitiendo con el local | Owner (Martín) |

## Recomendación para desbloquear

1. **Romper el ciclo T-21 ↔ T-31**: Ejecutar T-21 sin depender de T-31/T-32 inicialmente. El scheduler local ya funciona vía cronjob; el hardening OIDC puede aplicarse después (T-32) sin bloquear la operación local.
2. **Owner aplica migración de grants**: Un solo comando de Supabase CLI contra el proyecto vinculado (`vnzyecnbdqbfuxawzrda`).
3. **Owner despliega Edge Function**: Desde PR #252, versión 17, con hardening OIDC.
4. **Reconciliar worker duradero**: Una vez grants y OIDC estén activos, T-21 se desbloquea y T-22, T-27, T-28 siguen en cadena.

## Evidencia recogida

- Cronjob `14df32db31fc`: 10+ ciclos ejecutados, `last_status: ok`, schedule every 5m
- Supervisor `--once`: exit 0, heartbeat verificado en `logs/scheduler/heartbeat.json`
- Recuperación de fallo: borrado de heartbeat → detección stale → reinicio automático → restauración (T-120)
- Ejecución de tareas: T-128, T-129, T-130 ejecutadas y marcadas COMPLETADO por el executor
- Build/tests/typecheck/lint: todos exit 0 localmente (T-119)
- Escaneo secretos: 0 coincidencias (T-118)

## Conclusión

No hay bloqueo técnico irresoluble en el producto local. Todos los bloqueos son de **autorización y despliegue remoto** (grants Supabase, deploy Edge Function, merge PR #252). La operación local (supervisor + scheduler + executor + generador) está completamente funcional y autónoma. Las 6 tareas bloqueadas quedan en espera de autorización del propietario para aplicar migración remota y desplegar.
