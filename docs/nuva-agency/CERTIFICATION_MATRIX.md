# Nüva One — Independent Certification Matrix

## Purpose
This is the acceptance contract for the autonomous workforce. It prevents "green CI" from being mistaken for "product complete".

**100% is allowed only when every required row has current PASS evidence and no unresolved critical/high blocker exists.**

| Level | Domain | Required evidence |
|---|---|---|
| C1 | Code integrity | lint, TypeScript, tests, production build |
| C2 | Integration | routes, APIs, Supabase integration, permissions, critical module connectivity |
| C3 | Business | transactional flows and domain invariants |
| C4 | Experience | UX, responsive, accessibility, loading/empty/error states |
| C5 | Production | smoke, observability, runtime health, release/rollback evidence |

## Mandatory business chain
tenant -> customers -> products -> purchase -> receipt -> inventory -> sale -> payment -> cash/finance -> accounting -> Nüva Intelligence -> Action Queue -> outcome -> reports

A broken link or invariant blocks release certification.

## Domain owners
Finance: finance/cash/accounting.
Sales: sales/CRM/quotes.
Supply: purchasing/inventory/fulfillment.
People: HR/payroll/labor.
Compliance: Chilean compliance/risk.
Security: auth/RLS/tenant isolation/privacy/AppSec.
QA: deterministic tests/regression.
UX: accessibility/responsive/interaction/visual consistency.
Sentinel: runtime/observability/incidents.
Release: evidence aggregation/final gate.
Orchestrator: dependency ordering/unresolved-blocker ownership.

## Evidence states
- PASS: current deterministic evidence satisfies the criterion.
- WARN: evidence is incomplete or an external dependency remains.
- FAIL: criterion is violated or a regression exists.
- UNKNOWN: not tested; UNKNOWN is never PASS.

## Anti-self-certification
The implementing agent cannot be the sole certifier. At least one independent layer must challenge the result: deterministic CI/test, independent safety workflow, domain specialist, production smoke/runtime evidence, or another explicit matrix check.

For security, financial, payroll and data-integrity changes, require deterministic tests plus domain/security verification where applicable.

## Release calculation
Report independently:
- implementation_percent: verified scope implemented.
- certification_percent: required criteria with PASS evidence.
- provider_health_percent: AI providers with valid live evidence; deterministic fallback does not count as an AI provider.
- release_readiness: READY only when mandatory C1-C5 criteria are PASS and no critical/high blockers exist.

Never average these into a misleading single score.

## Overnight protocol
1. Inspect current evidence and open work.
2. Select the highest-priority UNKNOWN/FAIL/WARN that is safe and actionable.
3. Assign the domain specialist.
4. Implement one coherent change or perform one focused verification.
5. Run independent checks.
6. Record evidence and residual risk.
7. Leave the next highest-value target for the next cycle.

When safe actionable work is exhausted, switch to surveillance/certification instead of inventing changes.

## External provider rule
Cloudflare Workers AI remains external unless live account/model evidence proves otherwise. The deterministic fallback maintains continuity but is not an LLM and never counts as one.

## Certification language
Use "certified" only with evidence, "verified" for a specific passing check, "ready" only when the release gate says READY, and "blocked" when an external dependency prevents required evidence. Never use "100%" as a motivational approximation.
