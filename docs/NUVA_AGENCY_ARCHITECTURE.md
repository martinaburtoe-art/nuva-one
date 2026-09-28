# Nüva Agency — Control Plane

## Purpose
Nüva Agency is the autonomous operations organization behind Nüva One. It continuously observes the product, investigates signals, coordinates specialist agents, proposes or executes bounded remediations, verifies outcomes, and records evidence for learning.

## Operating loop

signal → correlate → investigate → deliberate → risk gate → plan → sandbox → act → verify → observe → learn

## Councils

### Business Council
Finance, Sales, Supply, People, Compliance, Growth.

### Operations Council
Engineering, QA, Security, Database, DevOps, Performance, AI Reliability.

The existing Nüva Agent Council remains the business decision layer. Nüva Agency adds the technical operations layer and a common control plane.

## Core departments

- Sentinel: telemetry, incidents, anomaly correlation.
- Engineering: frontend, backend, architecture, refactoring, migrations.
- QA: browser journeys, regression, visual, accessibility, API and data checks.
- Security: AppSec, dependencies, secrets, RLS, auth, AI security and threat modeling.
- Data: PostgreSQL, Supabase, integrity, migrations and query performance.
- DevOps: CI/CD, Vercel, environments, release and rollback.
- Performance: web vitals, bundle, API and database latency.
- FinOps: Vercel, Supabase, model and storage cost anomalies.
- Growth: SEO, analytics, conversion, content and competitive signals.
- Compliance: legal parameters, privacy, audit evidence and policy drift.
- AI Reliability: model quality, traces, tool errors, cost, latency and agent drift.

## Autonomy levels

L0 OBSERVE — collect evidence and report.
L1 RECOMMEND — investigate and prepare an action, no write.
L2 CONTROLLED_AUTOHEAL — only allow-listed, reversible, low-risk actions with deterministic verification.
L3 AUTONOMOUS_ENGINEERING — branch, modify, test, create PR, preview deploy and verify. Production promotion remains gated.
L4 STRATEGIC — create improvement initiatives from recurring evidence; no direct production mutation.

## Safety invariants

1. Production credentials are never passed to general-purpose agents.
2. Agents receive capability-scoped tools, not broad credentials.
3. Every write action has an incident/action ID and evidence.
4. Every remediation must have a verification plan before execution.
5. Failed verification triggers rollback where rollback is available.
6. No agent may self-approve a high-risk production action.
7. Repeated failures are escalated instead of retried indefinitely.
8. Business data is read through tenant-scoped interfaces and existing RLS controls.
9. The control plane itself is observable.

## Canonical entities

- Finding: an observed condition with evidence.
- Incident: correlated findings requiring coordinated handling.
- Hypothesis: a testable root-cause explanation.
- Action: an intended or executed mutation.
- Verification: evidence that an action achieved its expected outcome.
- Learning: reusable knowledge extracted from a completed incident.

## Recommended repository layout

src/lib/agency/
  types.ts              shared domain contracts
  policy.ts              autonomy/risk gates
  registry.ts            agent capability registry
  correlation.ts         incident grouping
  verification.ts        verification contracts
  memory.ts              learning contracts

.github/workflows/
  nuva-agency-sentinel.yml
  nuva-agency-qa.yml
  nuva-agency-security.yml
  nuva-agency-verify.yml

docs/nuva-agency/
  runbooks/
  adr/

## Rollout

Phase 1: contracts, policy, evidence schema, sentinel and verification workflow.
Phase 2: browser QA and regression healer in PR/preview environments.
Phase 3: security and database specialists.
Phase 4: autonomous PR creation and preview verification.
Phase 5: controlled production auto-healing for explicitly allow-listed remediations.
Phase 6: strategic improvement loops and cross-domain learning.

## External patterns adopted

The design is informed by autonomous QA, multi-agent QA, AppSec agent teams, agent observability and SRE council patterns. Nüva should implement the contracts and safety model itself rather than copy any external runtime wholesale.

## Implementación actual

La primera capa operativa ya está aterrizada en el repositorio:

- **Nüva Sentinel v1** ejecuta observación periódica de producción, GitHub Actions y Supabase cuando sus credenciales opcionales están configuradas.
- Cada señal genera un **fingerprint determinista** y evidencia JSON en `artifacts/nuva-agency/sentinel.json`.
- Las señales `warning` y `critical` se transforman mediante el **Incident Engine** en incidentes deduplicables, hallazgos, hipótesis y verificaciones pendientes.
- El workflow conserva una postura **observe-only**: no modifica producción ni ejecuta auto-reparaciones.
- Las señales críticas pueden abrir un issue de GitHub para iniciar el circuito de investigación y verificación.

GitHub Actions soporta workflows por eventos y por programación, por lo que esta capa puede operar como vigilancia continua sin convertir cada decisión en una mutación automática. La producción queda separada de la automatización de ingeniería hasta que exista evidencia y verificación determinista suficiente.
