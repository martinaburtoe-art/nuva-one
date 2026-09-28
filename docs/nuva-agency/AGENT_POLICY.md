# Nüva Agency — Agent Policy

## Never grant

- unrestricted production database access
- repository administrator permissions to agents
- secret export capabilities
- irreversible production mutations to autonomous agents
- self-approval of HIGH or CRITICAL actions

## Auto-heal allow-list

The initial allow-list is intentionally empty. A remediation becomes eligible only after it has a deterministic verification routine, a rollback path, a bounded blast radius, and repeated successful historical executions.

Examples that may eventually qualify:

- retrying a transient CI job
- restarting a non-production preview deployment
- refreshing a stale generated artifact
- recreating a failed disposable test environment

Production data mutation is disabled and is not part of the initial auto-heal scope.

## Escalation

Escalate after two unsuccessful remediation attempts, contradictory specialist findings, missing evidence, verification failure, or any HIGH/CRITICAL risk classification.
