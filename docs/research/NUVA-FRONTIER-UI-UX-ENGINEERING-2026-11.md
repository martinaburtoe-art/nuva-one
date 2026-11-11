# Nüva One — Frontier UI/UX & Frontend Engineering Research
**Research cut:** 10–11 November 2026
**Scope:** authenticated product workspace; Resumen first, then Caja, Inventario, Finanzas, CRM, Intelligence and other operational modules.
**Status:** research and architecture proposal; not a claim that proposed capabilities are implemented.

## Executive position
Nüva should not compete by adding another visual skin, glass cards, gradients or decorative motion. The opportunity is to make the product an adaptive business workspace: a system that understands the current operational question, presents the right representation of the business, lets the user investigate causes, and prepares controlled actions with evidence.

The frontier is the convergence of: (1) adaptive visual analytics; (2) constrained generative UI; (3) agentic operations; (4) relational and temporal business views; (5) spatial continuity and high-performance interaction; (6) responsive interaction designed around tasks, not desktop layouts squeezed into phones.

## 1. Evidence and frontier signals

### 1.1 Adaptive visualizations and representation switching
- The State of the Art in User-Adaptive Visualizations (Computer Graphics Forum, 2024) structures how systems capture user/task traits, decide adaptation and intervene in visualizations. https://onlinelibrary.wiley.com/doi/full/10.1111/cgf.15271
- Room for Improvement: Dashboard Design Approaches to Facilitate Smart Home Fault Diagnosis (PACM IMWUT, 2026) compares functional, spatial and relational dashboards. Different representations help different diagnosis tasks; dependency graphs improve some complex reasoning but create a transparency/complexity trade-off. https://doi.org/10.1145/3810237
- Continuous Behavioral Synthesis for Adaptive Health Dashboards (PACM HCI / EICS, 2026) explores explicit preferences, spatial reorganization, attention signals and explainable adaptation; it notes the need for independent UX validation. https://doi.org/10.1145/3816779
- What Do We See First? Proximity-Compatible Dashboard Layout Improves Visual Search Efficiency (2026) reinforces proximity compatibility: related values and explanations should be visually close. https://doi.org/10.1177/10711813261484494

Nüva implication: named view modes (Executive, Operational, Diagnostic, Timeline) and user-pinned layouts. Never silently reshuffle a user's workspace. Every adaptation should state why it occurred and offer undo/lock.

### 1.2 Generative UI and agent-to-UI protocols
- A2UI is an open protocol/framework for agents to stream declarative UI data to native renderers (React, Angular, Lit, Flutter, SwiftUI, Jetpack Compose). Its schema and component catalog provide capability boundaries. Apache-2.0. https://github.com/a2ui-project/a2ui
- CopilotKit Generative UI examples compare controlled (AG-UI), declarative (A2UI / Open-JSON-UI), and open-ended (MCP Apps / custom components) approaches. https://github.com/CopilotKit/generative-ui
- Awesome Generative UI is a discovery map of protocols, frameworks, renderers, UI kits and research, not a dependency recommendation. https://github.com/ianwieds/awesome-generative-ui
- Apple, Mapping the Design Space of User Experience for Computer Use Agents (IUI, 2026), identifies user control, explainability, prompts, mental models and risk/error handling as core UX dimensions. https://machinelearning.apple.com/research/mapping

Nüva implication: prototype a controlled, schema-driven renderer for high-value surfaces (reorder proposal, cash discrepancy review, customer follow-up plan). Start with server-authored schemas and an allowlisted component catalog. The model may compose approved components and populate validated data; it must not invent routes, permissions, SQL, arbitrary JavaScript or execute money/inventory mutations directly.

### 1.3 Visual analytics, graph interfaces and large datasets
- Apache ECharts: interactive charting and data visualization engine; Apache-2.0. Evaluate when current Recharts composition cannot express linked brushing, complex drilldowns, heatmaps or richer analytical views. https://github.com/apache/echarts
- React Flow / xyflow: customizable React graph and node-editor primitives, MIT. Suitable for a bounded operational dependency map, not every dashboard. https://github.com/xyflow/xyflow
- TanStack Table: headless data-grid logic with sorting, filtering, grouping, aggregation, selection and server-side support. MIT. https://github.com/TanStack/table
- TanStack Virtual: virtualizes large lists, grids and tables. Evaluate only where profiling shows an actual bottleneck. https://github.com/TanStack/virtual
- Human-centered visual analytics (Visual Informatics, 2025) keeps human analytical reasoning central while integrating automated processing. https://doi.org/10.1016/j.visinf.2025.100269
- TraVIS (IEEE TVCG, 2025) studies user-trace analysis for user-centered visual analytics design. https://pubmed.ncbi.nlm.nih.gov/40095820/

Nüva implication: progressive path from summary → contributing records → relationships → timeline/scenario. Preserve filters and selection across representations. Graph view is an optional diagnostic lens, not the default for non-experts.

### 1.4 Modern web interaction and motion
- Chrome Modern Web Guidance recommends View Transitions for layout-state continuity, scroll-driven animations for non-essential scroll effects, and transform/opacity to keep motion on the compositor. https://github.com/GoogleChrome/modern-web-guidance/blob/main/guides/ui-behaviors/motion/guide.md
- MDN View Transition API supports SPA and cross-document transitions that can preserve context and reduce perceived navigation cost; focus, reading position and accessibility still need deliberate testing. https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- Apple WWDC25 — What's new in Safari and WebKit covers scroll-driven animation, cross-document transitions, anchor positioning and media capabilities. https://developer.apple.com/videos/play/wwdc2025/233/
- W3C WCAG 2.2 includes focus visibility/appearance, focus not obscured and target-size criteria. Treat AA as baseline and 44px touch targets as a product design target where feasible. https://www.w3.org/TR/WCAG22/

Nüva implication: motion explains continuity (a selected KPI becomes a detail panel, a row opens into a record, a chart selection scopes a table). Avoid motion that delays work, hijacks scroll or hides controls behind hover.

## 2. Technology shortlist and decisions
| Capability | Candidate | Decision |
|---|---|---|
| Declarative agent UI | A2UI | Prototype behind feature flag; no wholesale adoption yet |
| Agent ↔ app events | AG-UI / CopilotKit | Compare with existing multi-provider AI layer before selection |
| Rich analytics | Apache ECharts | Spike against one real Resumen diagnostic task |
| Relationship map | React Flow / xyflow | Use only for a dedicated diagnostic surface |
| Data grid | TanStack Table | Adopt where current tables fail task requirements |
| Large lists | TanStack Virtual | Add only after profiling proves need |
| Motion | Native View Transitions + Motion.dev selectively | Prefer native browser/CSS first; benchmark overhead |
| UI primitives | Existing Radix/shadcn patterns | Extend current system; avoid competing component stacks |
| Testing | Playwright + axe-core + visual snapshots | Make this a release quality gate |

## 3. Fit with the actual Nüva codebase
- Current foundation: React + TypeScript + Vite + TanStack Router.
- Supabase-backed business data and existing query/cache patterns.
- Recharts currently powers dashboard visualizations.
- Authenticated palette is scoped to body[data-nuva-surface=app].
- Existing semantic tokens use pearl surfaces, graphite text, controlled indigo and restrained gold; public homepage remains a separate dark/editorial direction.
- Resumen already calculates real income, expenses, net result, inventory value, sales, product count, low stock, quotes, customers and cash-register state. New views must reuse domain facts, not invent parallel metrics.

Do not migrate to Next.js or replace the app shell for design fashion. Require measured evidence (routing/SSR needs, bundle, runtime, deployment, developer velocity) before architectural migration.

### Proposed architecture layers
1. Domain evidence: typed, tenant-scoped, permission-checked business facts with freshness and provenance.
2. View models: derived, testable representations for Executive / Operational / Diagnostic / Timeline.
3. Adaptive policy: deterministic rules first; explicit user preferences; AI recommendations only as suggestions with rationale.
4. UI schema: versioned JSON schema, component allowlist, prop validation, bounded payloads, safe links and action IDs.
5. Renderer: native React components with accessible loading/empty/error/partial states.
6. Action broker: server-side authorization, idempotency, audit trail and explicit confirmation for sensitive operations.
7. Observability/evaluation: task completion, time-to-diagnosis, misclicks, correction rate, render performance and mobile quality.

## 4. Five prototype experiments (ranked)

### P0 — Resumen Diagnostic Lens
Select net result and open a connected explanation: contributing categories, transaction timeline, products/customers/branches where data supports them, drill-down to source records, and preserved filters on back/close. Success: users identify the top contributing factor with fewer navigation steps; no synthetic causes or unsupported comparisons.

### P0 — Adaptive Workspace with user control
Named layouts for Executive, Operations and Analysis. Reorder/pin panels; save per user/business; reset and undo. No silent rearrangement. On mobile, layouts become task-oriented sequences, not tiny desktop grids. Success: improved task completion and reduced navigation effort without reducing discoverability.

### P1 — Agentic Reorder Proposal
User asks for replenishment. Nüva produces a reviewable proposal with current stock, reorder threshold, sales velocity if available, supplier, estimated cost, evidence freshness and confidence. Human edits/approves. Server revalidates stock and permissions at commit time. Success: traceability, zero unauthorized mutations, idempotent execution and reduced time-to-order.

### P1 — Operational Relationship Map
Focused graph for a concrete problem: sale → inventory decrement → reorder trigger → purchase → supplier → cash impact. Include a non-graph list/table alternative and explain graph edges. Success: better cross-module diagnosis without overwhelming users.

### P2 — Context-preserving motion and command surface
A selected record expands into a detail surface with View Transition; global command/search navigates to entities and actions while preserving keyboard focus, permissions and direct URLs. Success: reduced context loss and faster task completion; no motion-induced layout shift or focus loss.

## 5. Non-negotiable safeguards
- No fabricated KPIs, trends, predictions, confidence values or causal explanations.
- Distinguish observed fact, computed metric, estimate, recommendation and action result.
- Every number has period, currency, source and freshness state where relevant.
- Tenant isolation, RLS, server authorization and business rules remain authoritative.
- Generated UI is schema-constrained; no arbitrary code execution.
- Sensitive operations require confirmation and server-side revalidation.
- Adaptation is visible, reversible, user-controllable and never changes permissions.
- Reduced motion, keyboard, screen reader, contrast, focus and touch targets are acceptance criteria.
- Performance budgets must be measured on low/mid-range Android devices, not desktop only.
- Do not add dependencies until a spike demonstrates measurable advantage over the current stack.

## 6. Evaluation protocol
Test realistic demo data and at least four personas: owner, operations manager, sales user, inventory user. Test 320, 360, 390, 430, 768, 1024, 1280 and 1440 CSS px.

Measure task completion rate and time-on-task; route changes/context switches; error/correction rate; time-to-diagnosis; keyboard completion and focus retention; WCAG 2.2 AA; 44px target guideline; LCP, INP, CLS and interaction latency on mobile; bundle-size delta and memory/render cost; user confidence calibrated against actual correctness.

A visual prototype is not a pass. Each experiment must include functional behavior, real data contracts, responsive behavior and automated checks.

## 7. Source library
### Research
- https://onlinelibrary.wiley.com/doi/full/10.1111/cgf.15271
- https://doi.org/10.1145/3810237
- https://doi.org/10.1145/3816779
- https://doi.org/10.1177/10711813261484494
- https://machinelearning.apple.com/research/mapping
- https://doi.org/10.1016/j.visinf.2025.100269
- https://pubmed.ncbi.nlm.nih.gov/40095820/
### Open source
- https://github.com/a2ui-project/a2ui
- https://github.com/CopilotKit/generative-ui
- https://github.com/ianwieds/awesome-generative-ui
- https://github.com/xyflow/xyflow
- https://github.com/apache/echarts
- https://github.com/TanStack/table
- https://github.com/TanStack/virtual
### Platform and standards
- https://github.com/GoogleChrome/modern-web-guidance
- https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- https://developer.apple.com/videos/play/wwdc2025/233/
- https://www.w3.org/TR/WCAG22/

## 8. Recommended sequence
1. Complete authenticated visual QA of current Resumen preview and establish baseline.
2. Build P0 Diagnostic Lens using existing data and React architecture.
3. Prototype Adaptive Workspace with explicit controls and user preferences.
4. Run A2UI/AG-UI technical spike isolated behind a feature flag; do not route production actions through it.
5. Compare ECharts with Recharts on one real analytic task; compare React Flow only for the operational relationship map.
6. Extend to Caja, Inventario, Finanzas and CRM only after shared primitives pass responsive, accessibility and task-based evaluation.

**Definition of frontier for Nüva:** a measurable improvement in how quickly and accurately a business user understands a situation and completes a safe operation — not novelty for novelty's sake.