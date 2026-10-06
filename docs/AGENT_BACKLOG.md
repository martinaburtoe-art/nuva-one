# Nüva One Autonomous Engineering Backlog

This backlog is intentionally evidence-driven. Autonomous agents should select the highest-priority item they can verify from the current repository state and finish one coherent task per run.

## Overnight mission — continuous completion

The workforce is authorized to continue through repeated scheduled cycles while the owner is offline. The objective is to reduce the verified gap between the current repository state and a genuinely releasable Nüva One.

Each cycle must:
- select the highest-priority verified blocker or incomplete capability;
- implement and validate one coherent fix;
- preserve all safety gates and previously certified work;
- leave evidence and a concrete next target for the following cycle;
- never invent work merely to keep the rotation active.

The mission does not end when a single worker finishes. It ends only when current release criteria are evidenced as satisfied or every remaining blocker is explicitly external, documented and actionable.

## Operating lanes

### P0 — Reliability / production
- Execute the Market Release Gate in issue #144.
- Investigate and repair any current failing CI workflow.
- Investigate current Vercel production/runtime errors if evidence exists.
- Repair broken user-facing flows discovered by automated verification.

### P0 — Product scope integrity
- Keep retired Studio, n8n runtime and WhatsApp surfaces out of active product/runtime code.
- Resolve any contradictory documentation, registry entry, route or workflow that reintroduces retired scope.
- Never remove historical audit evidence; supersede it with a newer decision record when needed.

### P1 — Product completeness
- Verify that core modules remain reachable through normal navigation and search.
- Identify incomplete flows in sales, inventory, expenses, reports, CRM, quotes, purchases, Nüva Intelligence, Finance and People.
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
