# NEXT_ACTIONS — Nüva One Factory

Próxima tarea ejecutable. Se actualiza al finalizar cada bloque de trabajo y después de cada cambio relevante de estado.

## Próxima tarea seleccionada
**T-13 — COMPLETADA Y VERIFICADA (T-13.1).** `nuva-ci-diagnostics` operativo y validado:
- Archivos versionados en commit `fe633201`, rama publicada en origen (PR #252 head ahora `fe633201`)
- 9/9 pruebas de fixtures PASS, 7/7 self-test PASS
- Diagnóstico real PR #252 → 11/11 CI PASS + 4/4 puertas locales PASS
- Integración CI añadida a `.github/workflows/ci.yml`

| ID | Estado | Título | Evidencia |
|----|--------|--------|-----------|
| T-13 | COMPLETADA Y VERIFICADA | `nuva-ci-diagnostics` implementado, versionado, probado e integrado en CI | commit `fe633201`, 9/9 pruebas, 11/11 checks PR #252, paso CI en ci.yml |

### Motivo de prioridad
T-08, T-09, T-11 (3 ciclos), T-12, T-13 y T-13.1 COMPLETADAS. No hay tareas desbloqueadas sin intervención externa: T-14, T-15, T-16 están BLOQUEADAS por B-001 (credenciales de Google), B-002 (service_role key de Supabase) y B-003 (logs de Vercel) respectivamente.

### Siguiente tarea segura recomendada
Ninguna nueva tarea de código por iniciativa propia (regla de cierre de T-13.1: no volver a ampliar el mismo script sin deficiencia demostrada). Las siguientes tareas seguras requieren selección desde el backlog real:

1. **Auditoría de seguridad multiempresa con pruebas negativas reproducibles** — prioridad si no hay bloqueos externos. Puede avanzar con código y pruebas existentes (biz-data.test.tsx, shifts-table.tsx, RPC críticos ya verificados).
2. **Cobertura de regresión de módulos y rutas autenticadas** — 43/43 rutas auditadas en T-08; matriz PASS/FAIL/BLOCKED/UNKNOWN disponible.
3. **Verificación de permisos y contratos de RPC desde el código y las pruebas disponibles** — 4 RPC críticos ya verificados server-side seguros (P3).
4. **Preparación de diagnósticos para los bloqueos externos, sin fingir resolverlos** — documentación de B-001, B-002, B-003, B-005, B-007 con pasos exactos necesarios para desbloquear cada uno.

### Precondiciones
- `docs/factory/PROJECT_STATE.md` vigente (T-13 COMPLETADA, HEAD `fe633201` tras push, tests 351/351, CI 11/11 PASS)
- `docs/factory/TASK_REGISTRY.md` vigente (T-13 COMPLETADA Y VERIFICADA)

### Criterio de finalización (T-13.1)
- Archivos de T-13 versionados en git (commit `fe633201`) ✓
- Pruebas reproducibles desde checkout limpio (9/9 PASS) ✓
- Suite se ejecuta en GitHub Actions (paso añadido a `ci.yml`) ✓
- Diagnóstico real del PR #252 verificado (11/11 CI PASS + 4/4 locales PASS) ✓
- Discrepancias documentadas: archivos no versionados antes de T-13.1 (ahora resuelto), HEAD del PR vs local (ahoro resuelto tras push), CI no ejecutaba pruebas de T-13 (ahoro resuelto con paso en ci.yml)

### Tareas alternativas si esta está bloqueada
1. Ninguna tarea desbloqueada sin intervención externa (B-001, B-002, B-003 pendientes de credenciales del usuario).
