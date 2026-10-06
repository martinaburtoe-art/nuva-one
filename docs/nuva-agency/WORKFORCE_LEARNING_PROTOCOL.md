# Nüva Agency — Workforce Learning Protocol

## Purpose

The 13-worker workforce improves Nüva One continuously through an evidence-driven learning loop.

This is **not** an uncontrolled self-modifying model. A lesson becomes reusable knowledge only when it is supported by observable evidence.

## Learning loop

1. Observe: CI, tests, build output, production telemetry, Supabase advisors/logs, Vercel deployment state and GitHub activity.
2. Diagnose: identify the smallest verified root cause.
3. Act: implement one focused remediation.
4. Verify: lint, typecheck, tests, build and relevant domain checks.
5. Record: capture the pattern, remediation and validation evidence.
6. Reuse: future workers retrieve the evidence before choosing a similar task.
7. Evaluate: track whether the same failure recurs after the remediation.

## Memory layers

- Git history / PRs: implementation evidence.
- GitHub workflow summaries: execution evidence.
- `public.ops_agent_learning`: persistent structured learning memory already present in Supabase.
- `public.ops_findings`, `public.ops_metrics_hourly`, `public.ops_anomalies`: operational signals already present in Supabase.
- Repository documentation: stable policies and reusable engineering patterns.

## ML policy

Machine learning is used only when it is measurable and useful. Candidate tasks include anomaly detection, failure clustering, regression-risk scoring and outcome prediction.

The workforce must never claim that it "learned" merely because an LLM generated text. A genuine ML training/evaluation claim requires:
- a dataset or explicit feature source;
- a reproducible training/evaluation procedure;
- metrics or validation evidence;
- persisted version/evaluation metadata;
- a rollback path when quality regresses.

Until those conditions exist, the workforce uses **evidence-based retrieval and statistical/anomaly learning**, not self-training claims.

## External systems

GitHub is the primary source-control control plane. Supabase and Vercel access is conditional on scoped credentials available to the workflow. Credentials must never be committed or exposed in logs.

External mutations must remain least-privilege and auditable. Production schema changes continue through migrations and CI rather than arbitrary agent SQL.
