# Nüva One — Autonomous Agent System

## Objective

Run a continuous engineering loop around the real Nüva One repository: observe → select one verified task → implement → validate → propose a pull request → review → repeat.

The system is designed to keep human control over merges while allowing the engineering work itself to continue without the user's active presence.

## Agents

### 1. Autonomous Builder

Workflow: `.github/workflows/nuva-agent-builder.yml`

Cadence: every 30 minutes + manual dispatch.

Responsibilities:
- inspect the current repository state;
- select one evidence-backed task from `docs/AGENT_BACKLOG.md`;
- implement it using the existing architecture;
- run focused lint/typecheck/tests/build;
- open/update one autonomous PR.

The builder stops when an autonomous PR is already open so it does not create competing changes.

### 2. CI Repairer

Workflow: `.github/workflows/nuva-agent-ci-repair.yml`

Trigger: failed `CI` workflow + manual dispatch.

Responsibilities:
- read the actual failed CI logs;
- distinguish infrastructure failure from repository failure;
- fix only verified repository causes;
- validate the repair;
- create a focused repair PR.

### 3. PR Reviewer

Workflow: `.github/workflows/nuva-agent-review.yml`

Trigger: PR opened/reopened/synchronized.

Responsibilities:
- read the actual diff;
- identify blocking defects and regression risks;
- inspect security/RLS implications when relevant;
- verify test adequacy;
- publish a review report without editing the PR.

### 4. Health Auditor

Workflow: `.github/workflows/nuva-agent-health.yml`

Cadence: daily + manual dispatch.

Responsibilities:
- read-only repository health audit;
- identify evidence-backed blockers and unfinished high-value work;
- create a GitHub issue only when actionable findings exist.

## Security model

- Gemini CLI is run through Google's maintained `run-gemini-cli` GitHub Action.
- Project instructions live in `GEMINI.md`.
- Local Gemini state and credentials are ignored by Git.
- Autonomous code changes are proposed through PRs rather than pushed directly to production.
- The builder uses focused validation before PR creation.
- The CI repairer is explicitly instructed not to weaken quality gates.
- The reviewer runs in read-only planning mode.

## Required secrets

### `GEMINI_API_KEY`

Required for the Gemini engine. Use a dedicated Google AI Studio project for autonomous engineering instead of sharing the project used for Veo media generation. Gemini rate limits are project-scoped, so isolating the workloads prevents media generation from exhausting the engineering agent's quota.

### `AGENT_GITHUB_TOKEN` (recommended)

Optional fallback token used by the PR creation action. A dedicated GitHub App installation token is preferable for a mature setup. The workflow falls back to the built-in `GITHUB_TOKEN` when this secret is absent.

A dedicated token/App is useful because GitHub documents that workflow-created changes made with the built-in `GITHUB_TOKEN` have restrictions around triggering subsequent workflows. A dedicated token/App can allow the PR's normal CI lifecycle to proceed without manual approval, subject to repository policy.

## Model strategy

The default autonomous model is a fast Gemini model. Use `GEMINI_MODEL` as a repository variable when a different available model is appropriate.

Do not use expensive reasoning/media models for routine maintenance. Reserve higher-cost models for tasks where the fast model cannot safely resolve the problem.

## Operational loop

```text
              ┌───────────────────────┐
              │  Daily Health Auditor  │
              └───────────┬───────────┘
                          │ findings
                          ▼
┌───────────────┐   ┌───────────────┐
│ CI Repairer   │◄──│ Agent Backlog │
└───────┬───────┘   └───────┬───────┘
        │                   │
        └─────────┬─────────┘
                  ▼
         ┌─────────────────┐
         │ Autonomous      │
         │ Builder         │
         └────────┬────────┘
                  │ PR
                  ▼
         ┌─────────────────┐
         │ PR Reviewer     │
         └────────┬────────┘
                  │ evidence
                  ▼
         ┌─────────────────┐
         │ Human merge     │
         │ / repository    │
         │ merge policy    │
         └────────┬────────┘
                  │
                  ▼
               main → CI → production
```

## What 24/7 means here

The agents are continuously scheduled and event-driven; they do not require the user's computer to remain on. GitHub-hosted runners execute the jobs in the cloud. A 30-minute cadence provides continuous coverage while concurrency prevents the builder from flooding the repository with competing PRs.

The actual limiting resource is AI inference quota, not the user's PC. The public Nüva One repository can use standard GitHub-hosted Actions runners without the private-repository minute quota, while Gemini API usage remains subject to the configured project's model limits.

## Merge policy

The autonomous system intentionally does not blindly merge every generated change. A change should reach `main` only after its PR has evidence from the focused validation, normal CI, the autonomous review, and the repository's existing merge/security policy.

This preserves the project's existing preference for verified integration rather than destructive or forced merges.
