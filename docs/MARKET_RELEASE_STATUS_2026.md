# Nüva One — Market Release Status 2026

## Canonical release gates

| Gate | Estado | Evidencia |
|---|---|---|
| Alcance Studio / n8n / WhatsApp | PASS | Decisiones consolidadas en GEMINI.md, AGENT_BACKLOG.md, CORE_INTEGRATION_AUDIT y tool registry |
| Agency safety / construction | PASS | Agency certification structural gate + scheduled builder |
| Production deployment | PASS | Vercel production deployment READY en commits recientes |
| Core integration integrity | PASS | `nuva_core_integrity_audit()`: 0 fallos en checks documentados |
| pgTAP / recovery | RUNNING | CI ejecuta stack Supabase limpio + pgTAP + recovery |
| Typecheck / lint / unit / build | BLOCKED UNTIL CI | Dependen del gate database-tests |
| Production Smoke | RUNNING | Workflow activo sobre main |
| Nüva People validation | RUNNING | Workflow activo sobre main |
| Golden Business Simulation #145 | IN PROGRESS | Test canónico `supabase/tests/database/113_golden_business_simulation.sql` incorporado |
| Market Release Gate #144 | BLOCKED | Depende de evidencia completa de #145 y matriz reproducible |

## Golden Business Simulation

El gate canónico verifica, en una transacción de prueba aislada:

1. tenant + producto reproducibles;
2. compra recibida;
3. actualización de inventario;
4. transacción financiera;
5. asiento contable balanceado;
6. venta pagada;
7. actualización de inventario;
8. ingreso financiero;
9. asiento contable balanceado;
10. Action Queue -> Outcome con vínculo de tenant;
11. aislamiento entre tenants.

El test usa rollback y no modifica producción.

## Regla de certificación

Nüva One no se declara 100% certificado hasta observar CI completo, Production Smoke, Nüva People validation y evidencia reproducible del Golden Business Simulation. El Market Release Gate se cierra solamente cuando todos los FAIL/BLOCKED tienen evidencia o issue asociado.

## Agency

El Control Tower Owner-only expone 13 identidades especializadas:

Constructor, Orchestrator, Finance, Sales, Supply, People, Compliance, Growth, Security, QA, Sentinel, UX y Release.

Cada identidad tiene foco, nivel de autonomía y capacidades declaradas. La conversación se enruta al trabajador seleccionado y mantiene memoria persistente. La ejecución autónoma de construcción continúa protegida por los workflows y gates de Agency.
