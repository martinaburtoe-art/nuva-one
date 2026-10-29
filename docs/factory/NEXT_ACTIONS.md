# NEXT_ACTIONS — Nüva One Factory

Próxima tarea ejecutable. Se actualiza al finalizar cada bloque de trabajo y después de cada cambio relevante de estado.

## Próxima tarea seleccionada
**Fase 3 — Inspeccionar la instalación real de Hermes y activar el orquestador multiagente mínimo.**

### Motivo de prioridad
La memoria persistente (Fase 2) está creada. Antes de construir agentes, hay que verificar qué capacidades reales tiene Hermes en esta instalación: configuración, herramientas disponibles, subagentes, delegación, sesiones, ejecución en segundo plano, persistencia y recuperación. No asumir capacidades no verificadas.

### Precondiciones
- `docs/factory/PROJECT_STATE.md` vigente (estado verificado: rama `fix/reproducible-npm-ci-20261027`, HEAD `921fb2d6`, tests 350/350, typecheck PASS, build PASS)
- `docs/factory/BLOCKERS.md` vigente (6 bloqueos documentados)
- Rama de trabajo limpia salvo `routeTree.gen.ts` (LF/CRLF, excluido)

### Criterio de finalización
- Inventario real de herramientas de Hermes disponibles (no asumidas)
- Orquestador mínimo definido con roles reales (mínimo viable, no 8 procesos permanentes si no se justifican)
- Primera tarea delegada ejecutada con evidencia
- Memoria persistente actualizada con resultados

### Tareas alternativas si la Fase 3 está bloqueada
1. Completar auditoría de módulos restantes de `_authenticated/` no leídos aún (ai.tsx, billing.tsx, business-health.tsx, business-simulator.tsx, catalog.tsx, customer-action-center.tsx, customer-intelligence.tsx, customers-intelligence.tsx, executive-command-center.tsx, finance-accounting.tsx, finance-professional.tsx, financial-control.tsx, financial-dashboard.tsx, financial-integrity.tsx, help-center.tsx, mfa-required.tsx, mobile-scanner.tsx, people-attendance.tsx, people-compliance.tsx, people-employees.tsx, people-lifecycle.tsx, people-payroll.tsx, pricing-calculator.tsx, shifts.tsx, shipments.tsx)
2. Crear `docs/factory/DECISIONS.md` y ampliar `docs/knowledge/` con registros de decisión
3. Implementar skill `nuva-supabase-guardian` (roadmap item #8) o `nuva-ci-diagnostics` (item #9)
