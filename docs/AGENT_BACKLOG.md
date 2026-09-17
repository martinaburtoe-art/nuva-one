# Nüva One Autonomous Engineering Backlog

This backlog is intentionally evidence-driven. Autonomous agents should select the highest-priority item they can verify from the current repository state and finish one coherent task per run.

## Operating lanes

### P0 — Reliability / production
- Investigate and repair any current failing CI workflow.
- Investigate current Vercel production/runtime errors if evidence exists.
- Repair broken user-facing flows discovered by automated verification.

### P1 — Product completeness
- Verify that core modules remain reachable through normal navigation and search.
- Identify incomplete flows in sales, inventory, expenses, reports, CRM, quotes, purchases, Nüva Intelligence, and Nüva Studio.
- Implement one focused missing capability at a time with regression coverage.

### P1 — Security / data integrity
- Review only the changed security-sensitive surface when a task touches auth, RLS, tenant isolation, billing, checkout, or AI usage limits.
- Add regression tests for newly discovered authorization or isolation cases.

### P1 — Quality / testing
- Increase meaningful test coverage around recently changed modules.
- Fix flaky tests or brittle selectors with evidence from CI.
- Improve accessibility and responsive behavior where automated checks identify a concrete issue.

### P2 — Performance
- Investigate measurable slow routes, excessive bundle growth, redundant queries, or unnecessary client work.
- Prefer targeted optimizations with before/after evidence.

### P2 — Homepage / cinematic experience
- Improve the existing cinematic scroll-driven homepage and parallel no-video experience based on the repository's reference/continuity documents.
- Preserve the shared story engine and existing functional CTAs/navigation.
- Do not generate expensive video assets when the required quota or credential is unavailable.

### P2 — Nüva Studio
- Keep Nüva Studio visible in primary navigation, mobile navigation, and relevant search/command surfaces.
- Improve its create/research/Brand DNA/opportunity workflows only when the current implementation shows a concrete gap.

### P3 — Documentation / developer experience
- Keep architecture, runbooks, and continuity documents aligned with the actual code.
- Improve agent instructions when repeated autonomous failures expose ambiguity.

## Selection rule

For each run, inspect current CI, open PRs/issues, recent commits, and the relevant module before selecting work. Prefer a verified blocker over a speculative improvement. Never create a task solely to keep the agent busy.

## Definition of done

A task is done only when:
- the requested behavior exists in the real application;
- relevant tests pass;
- no unrelated regressions are introduced;
- the diff is focused and explainable;
- the PR/summary records validation evidence and remaining risk.
