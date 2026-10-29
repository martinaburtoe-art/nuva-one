# NEXT_ACTIONS — Nüva One Factory

Próxima tarea ejecutable. Se actualiza al finalizar cada bloque de trabajo y después de cada cambio relevante de estado.

## Próxima tarea seleccionada
**T-10 — Ejecutar `nuva-ci-diagnostics` en PR #252 para confirmar que CI sigue verde post-commit `2aa31959`.**

### Motivo de prioridad
Se acaba de hacer commit `2aa31959` (documentación de Factory) en la rama `fix/reproducible-npm-ci-20261027`. Antes de seguir con nuevas tareas de código, hay que confirmar que el estado del repositorio sigue verde y que PR #252 mantiene sus checks pasados. Esto cierra el ciclo de verificación (Fase 4, pasos 2 y 8).

### Precondiciones
- `docs/factory/PROJECT_STATE.md` vigente (HEAD `2aa31959`, rama `fix/reproducible-npm-ci-20261027`, tests 350/350, typecheck PASS, build PASS)
- `gh` autenticado (verificado previamente con `gh pr checks/view` en sesión anterior)
- PR #252 abierto, HEAD `fix/reproducible-npm-ci-20261027` → base `main`

### Criterio de finalización
- `gh pr checks 252` muestra todos los checks en PASS (o se identifica cualquier regresión con evidencia)
- `git status` confirma working tree limpio salvo `routeTree.gen.ts` (excluido)
- Resultado registrado en `TASK_REGISTRY.md` (T-10 → COMPLETADA) y `PROJECT_STATE.md`

### Tareas alternativas si T-10 está bloqueada (gh sin auth, etc.)
1. T-08: Auditoría de módulos restantes `_authenticated/` no leídos (leer archivos, documentar hallazgos PASS/FAIL/BLOCKED)
2. T-09: Crear `docs/factory/DECISIONS.md`
3. T-11: Ejecutar 2 demostraciones más del ciclo de ejecución continua
