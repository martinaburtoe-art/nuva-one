# Nüva One — independent product and UX review brief

Date: 2026-11-16
Target: https://nuva-one.vercel.app/
Repository: https://github.com/martinaburtoe-art/nuva-one
Purpose: obtain independent, evidence-based product, UX, visual-design and accessibility reviews. This is an analysis brief, not authorization to modify production.

## Product context

Nüva One is a Chile-focused business operating SaaS for small and medium businesses. It brings together sales, point of sale, customers/CRM, quotations, inventory, purchases, expenses, finance, analytics, people operations and business intelligence. The experience must feel like a coherent professional application, not a collection of unrelated web pages.

Primary design goals:
- Premium, credible, calm, modern B2B product quality.
- App-like navigation and task continuity on mobile, tablet and desktop.
- Clear information hierarchy for dense operational and financial data.
- Fast perceived response, predictable feedback, useful loading/empty/error states.
- Spanish-first UX, Chilean business context, CLP formatting and locally understandable terminology.
- Accessibility and privacy by design.

## Review rules

1. Review the actual live product and/or the exact branch/commit supplied. State which URL, branch, commit, date and viewport were inspected.
2. Do not infer behavior from source code or a screenshot alone. Separate observed facts from hypotheses.
3. Do not claim WCAG conformance, functional correctness, security, or production readiness without the appropriate tests.
4. Do not change code, settings, data, permissions, billing, Supabase, or production. This review is read-only.
5. Use only demo/test accounts and synthetic data. Never record, expose, copy, or retain real customer data, employee data, salaries, contracts, identity documents, tax identifiers, payment data, or secrets.
6. For each finding, include: severity (P0–P3), exact screen/route, reproduction steps, evidence (screenshot or recording timestamp), user impact, and a concrete recommendation.
7. Avoid generic advice such as “make it cleaner”. Explain the hierarchy, spacing, interaction, copy, or behavior that should change and why.
8. Distinguish blockers from polish. Do not recommend removing business capabilities merely to simplify the UI.

## Required journeys

Inspect these journeys where access permits:
1. Sign in / account recovery / first-time onboarding.
2. Select or create a business and understand the active business context.
3. Resumen: understand business health, key numbers, alerts and the next recommended action.
4. Mobile navigation: reach a less prominent module, use “Más”, search, return and preserve context.
5. CRM: find a customer, understand their status, open a customer record and identify the next action.
6. Sales / POS: start a sale, select customer/product, handle stock and payment states without completing a real charge.
7. Quotations: create or edit a draft, understand numbering/status, preview and share safely without sending externally.
8. Inventory: find a product, inspect stock and understand low-stock/empty states.
9. Finance: understand cash, receivables, payables, period and data provenance.
10. People: inspect only synthetic/demo employee records and verify that confidential information is not exposed to unauthorized roles.
11. Global search, help, notifications, settings, logout and error/empty/offline states.

If a route is unavailable, blocked or requires credentials, report it as NOT TESTED rather than guessing.

## Evaluation scorecard

Score each dimension from 1–5 and justify the score with evidence:
- Visual craft and consistency
- Information architecture and navigation
- Task completion clarity
- Mobile ergonomics and responsive behavior
- Interaction feedback and perceived speed
- Data density, readability and hierarchy
- Empty, loading, error, offline and success states
- Accessibility (keyboard, focus, contrast, labels, touch targets, reduced motion)
- Trust, privacy cues and role-aware disclosure
- Spanish microcopy and Chilean business fit

## Deliverables

A. Executive verdict: strongest parts, biggest risks, and whether the product feels commercially credible.
B. Top 10 issues ranked by user impact, with evidence and reproducible steps.
C. Top 10 improvements ranked by value/effort.
D. Mobile-first review at 320, 360, 390 and 430 px; tablet and desktop review.
E. A proposed navigation and information architecture that reduces cognitive load without hiding important modules.
F. One alternative visual direction for Resumen and one for a dense operational module. Keep the existing product identity and business scope.
G. A prioritized 2-week remediation plan with acceptance criteria.
H. Explicit limitations: routes, roles, devices, and states not inspected.

## Prompt for an independent AI reviewer

Act as a principal product designer, senior UX researcher and accessibility specialist reviewing Nüva One. Follow this brief exactly. Inspect the live product or supplied screenshots/code, identify the evidence source for every finding, and give your independent opinion even if it disagrees with the current design direction. Be rigorous and specific. Do not edit code or production. Return the deliverables A–H. Separate observed defects, usability risks, and subjective design opportunities. Do not invent test results or claim that a route was inspected when it was not.

## Prompt for a visual concept generator

Create two clearly differentiated, high-fidelity design explorations for Nüva One:
1. A premium executive Resumen workspace for a Chilean SME owner.
2. A mobile-first operational workspace (CRM, POS or Inventory) with a strong app-like navigation pattern.

Preserve Spanish-first copy, business data hierarchy, CLP conventions, accessibility contrast and the Nüva brand character. Use realistic but synthetic data. Do not flatten the product into a generic analytics dashboard, remove operational modules, or introduce decorative animation that slows task completion. Show desktop and mobile variants and explain the design decisions.
