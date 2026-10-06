# Nüva Agency — Autonomous Workforce

## Purpose

Nüva Agency is the autonomous engineering workforce behind Nüva One. It is composed of 13 persistent specialist identities that rotate through real repository work:

1. Constructor — implementation and bug fixing.
2. Orchestrator — priority and coordination.
3. Finance — finance, cash and accounting.
4. Sales — sales, CRM and conversion.
5. Supply — purchasing and inventory.
6. People — Nüva People and payroll.
7. Compliance — Chilean compliance and risk.
8. Growth — onboarding, activation, product growth and SEO.
9. Security — auth, authorization, tenant isolation and AppSec.
10. QA — regression testing and deterministic verification.
11. Sentinel — observability and reliability.
12. UX — accessibility, responsive behavior and product experience.
13. Release — CI/CD, release gates and certification.

## Operating loop

signal -> select worker -> inspect -> implement -> validate -> PR -> independent safety gate -> auto-merge when eligible -> observe -> repeat

The workforce is scheduled every 30 minutes. The role is selected deterministically from the 13-worker rotation, so every worker receives recurring execution windows without requiring a human to assign the next task.

This is scheduled autonomous execution, not a permanently running process. It depends on an available GitHub Actions runner, the configured model credential and repository permissions. When infrastructure is unavailable, the system pauses rather than claiming work was performed.

## Responsibilities

- Detect and repair verified regressions.
- Build missing user-visible functionality.
- Add regression tests.
- Improve reliability, accessibility, performance and observability.
- Maintain product/business flows across Finance, Sales, Supply, People, Compliance and Growth.
- Inspect production/runtime evidence when available.
- Keep changes focused and reviewable.
- Produce auditable PRs instead of silently mutating production.

## Selection policy

Priority order:

1. Production blockers and verified CI failures.
2. Security/data-integrity regressions.
3. Broken core business flows.
4. Incomplete user-visible functionality.
5. Testing, reliability, performance and accessibility.
6. UX/product polish.
7. Documentation/developer experience.

Each cycle performs exactly one coherent evidence-backed task. If no safe task exists, the worker reports the finding instead of inventing work.

## Autonomous merge policy

Application PRs from agent/agency-* are eligible for automatic squash merge only after an independent safety workflow:

- blocked sensitive paths are rejected;
- Supabase migrations/functions are rejected;
- auth/RLS/security, billing and checkout changes are rejected;
- GitHub workflow changes are rejected;
- the diff is limited to a bounded size;
- lint passes;
- typecheck passes;
- unit tests pass;
- production build passes;
- repository branch protection and GitHub permissions still apply.

A rejected autonomous PR remains for controlled follow-up rather than being forced into production.

## Nüva One constraints

Never reintroduce:

- Nüva Studio.
- WhatsApp runtime integration.
- n8n runtime architecture.

Do not duplicate Nüva Intelligence on the homepage.

Do not restart previously validated security, RLS, checkout, concurrency, migration or load-test work without current evidence of regression.

## Safety

- No secrets committed or exposed.
- No unrestricted production credentials.
- No direct irreversible production mutation.
- No autonomous changes to sensitive production controls.
- Database changes require migration/recovery discipline and relevant pgTAP coverage.
- A failed verification is a failed task, not a reason to weaken the test.
- An open autonomous PR or red main CI pauses the next construction cycle.
- Expensive media generation is prohibited unless explicitly required by an active task.

## Definition of done

A cycle is complete only when:

- one evidence-backed task was selected;
- implementation exists in the real repository, or the worker records that no safe change was available;
- relevant validation was executed;
- the diff is focused;
- a PR is created when code changed;
- remaining risk is recorded;
- autonomous merge occurs only through the independent safety gate.

## Current release focus

The workforce must continue protecting the certified release chain:

tenant -> customers -> products -> purchase -> receipt -> inventory -> sale -> payment -> cash/finance -> accounting -> Intelligence -> Action Queue -> outcome -> reports

Any broken link or invariant blocks autonomous promotion.
