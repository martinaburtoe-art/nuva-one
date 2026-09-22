# Nüva One — Operating System

Nüva One evolves from ERP to an evidence-driven business operating system.

## Core loop

Data → evidence → intelligence event → risk/opportunity → recommendation → action → outcome → memory.

## Product layers

- **System of record:** sales, purchases, inventory, finance, CRM, people and tax.
- **Nüva Intelligence:** detects patterns and explains them using evidence.
- **Nüva Action Center:** converts findings into prioritized actions.
- **Business Simulator:** tests scenarios without mutating production records.
- **Business Memory:** stores explicit decisions, assumptions, goals and lessons with provenance.
- **Benchmarking:** stores cohort comparisons without exposing other businesses.
- **Autopilot:** governed execution with explicit policy, approval and constraints.
- **Outcome loop:** records expected vs actual impact so recommendations can improve.

## Safety invariants

1. No invented facts: every insight must carry evidence or be marked as an assumption.
2. Simulation never writes operational records.
3. Financial/external actions remain approval-gated by default.
4. Autopilot can execute only when the business policy explicitly allows it.
5. Every autonomous action must be idempotent and auditable.
6. Tenant isolation remains enforced by Postgres RLS.

## Product north star

Nüva should answer four questions continuously:

1. What changed?
2. Why did it change?
3. What is likely to happen next?
4. What should the business do now?

The goal is not more screens. The goal is a closed decision-to-action loop.
