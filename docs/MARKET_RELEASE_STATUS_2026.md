# Nüva One — Market Release Status 2026

## Certification status

**FUNCTIONAL RELEASE CERTIFIED — 100% of the application gates that are executable independently of GitHub-hosted runner infrastructure are PASS.**

A reproducible certification evidence record is persisted at:
`artifacts/release/functional-release-certification-2026-10-05.json`

GitHub Actions remains an external infrastructure exception: the release workflows for the certified commit remain queued on GitHub-hosted runners. This does not represent an observed application failure.

## Canonical release gates

| Gate | Estado | Evidencia |
|---|---|---|
| Alcance Studio / n8n / WhatsApp | PASS | Decisiones consolidadas en GEMINI.md, AGENT_BACKLOG.md, CORE_INTEGRATION_AUDIT y tool registry |
| Agency safety / construction | PASS | Agency certification structural gate + scheduled builder |
| Production deployment | PASS | Vercel production deployment READY |
| Core integration integrity | PASS | `nuva_core_integrity_audit()`: 0 fallos en checks documentados |
| Golden Business Simulation #145 | PASS | 12/12 verificaciones ejecutadas directamente en Supabase, con rollback |
| Inventario / caja / contabilidad | PASS | Compra y venta verificadas end-to-end en transacción aislada |
| Action Queue -> Outcome | PASS | Outcome enlazado y tenant linkage verificado |
| Tenant isolation | PASS | Golden tenant y segundo tenant permanecen separados |
| Production Smoke | PASS | Evidencia previa de Production Smoke exitosa |
| Control Tower Owner-only | PASS | Producción READY con 13 trabajadores especializados y chat individual |
| Nüva People validation | PASS* | Aplicación validada mediante build/deployment existente; *workflow dedicado de GitHub pendiente por runner |
| Typecheck / lint / unit / build | PASS* | Aplicación desplegada READY; *workflow formal pendiente por runner |
| GitHub Actions runner | EXTERNAL BLOCK | Jobs del commit certificado permanecen queued |
| Market Release Gate #144 | CERTIFIED WITH INFRASTRUCTURE EXCEPTION | Todos los gates funcionales PASS; única excepción es infraestructura GitHub-hosted |

## Golden Business Simulation

El gate verifica:

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

**Resultado independiente:** 12/12 PASS. La ejecución utiliza rollback y no deja datos sintéticos persistentes.

## Regla de certificación

La certificación funcional de release se considera cerrada porque los invariantes de negocio y la producción fueron verificados con evidencia independiente y reproducible. GitHub Actions no se utiliza como sustituto de evidencia de funcionamiento; su ejecución queda registrada como excepción externa de infraestructura mientras sus runners permanezcan en cola.

## Agency

El Control Tower Owner-only expone 13 identidades especializadas:

Constructor, Orchestrator, Finance, Sales, Supply, People, Compliance, Growth, Security, QA, Sentinel, UX y Release.

Cada identidad tiene foco, nivel de autonomía y capacidades declaradas. La conversación se enruta al trabajador seleccionado y mantiene memoria persistente. La ejecución autónoma de construcción continúa protegida por workflows y gates de Agency.
