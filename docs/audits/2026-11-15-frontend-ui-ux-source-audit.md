# Nüva One — Frontend / UI / UX audit (source-level)
**Audit date:** 2026-11-15  
**Baseline:** `main` at `6f72167172279b2d5759395a766ebc3340d852b9`  
**Production deployment:** Vercel READY, deployment `dpl_6WC6hreBwuJvfWxcNaURoH5BhsA9`  
**Scope:** authenticated shell, navigation, Resumen, design tokens, responsive navigation, QA coverage and pending design work.

> Evidence limitation: this is a source/repository/deployment audit. It is not a screenshot-based visual audit or authenticated end-to-end usability test. The public production URL could not be rendered in the available browser surface, and no authenticated customer session was available. Do not interpret this report as visual QA PASS.

## Executive assessment

Nüva One already has a substantial product foundation: a shared authenticated shell, role/module-filtered navigation, a dedicated mobile navigation model, semantic product tokens, reusable page states, and mobile-first improvements across several workflows. The latest production deployment is READY.

The largest remaining UX risk is not a lack of UI components. It is **information architecture and repeated information**: the shell exposes 39 destinations, and Resumen repeats several operational facts across the executive headline, KPI cards, operational status, mobile brief and shortcuts. This can make a feature-rich product feel more complicated than it needs to be.

No confirmed P0 business/security defect was established by this source-only review. The items below are UX/quality risks requiring visual and authenticated validation before code changes are merged.

## Findings

### F-01 — Navigation exposes too many peer destinations
**Priority: P1 · Evidence: `src/components/dashboard-shell.tsx`**

The navigation array contains 39 destinations across 9 sections. The largest groups include Finance (7 destinations), People (6), Sales and customers (5), and Purchases and inventory (5). Several destinations are closely related:
- Finance, professional finance center, financial dashboard, financial control, financial integrity and analytics.
- Customers, CRM action center and customer intelligence.
- People, employees, attendance, compliance, lifecycle and payroll.

The desktop shell groups and collapses sections, and the active section expands automatically. Mobile sensibly keeps Dashboard, POS, Sales and Inventory visible and places the remaining destinations under “Más”, with search. These are good foundations, but users still face many similarly weighted destinations after opening a group or the mobile directory.

**Recommendation:** retain every route and permission, but reorganize the visible IA around a smaller set of user jobs. Consolidate related destinations into module workspaces with contextual tabs/sub-navigation (Finance, Customers/CRM, People, Inventory/Procurement). Keep specialist tools reachable through module search or a secondary “Advanced” area. Do not delete or rename routes as a shortcut.

### F-02 — Resumen repeats important metrics across multiple blocks
**Priority: P1 · Evidence: `src/routes/_authenticated/dashboard.tsx`**

The page includes:
1. Industry intelligence panel with up to six evidence-backed metrics.
2. Financial hero with result, income and expenses.
3. A mobile operational brief with sales, low stock and cash state.
4. A KPI grid that repeats income and expenses and adds inventory and open quotes.
5. An operational-status block that repeats sales, low stock, open quotes, customers, cash state and quote value.
6. Quick links to Caja, Ventas, Inventario, Cotizaciones, Clientes and Finanzas.
7. Separate quote/document creation cards.
8. Period comparison metrics and largest-expense signal.
9. Financial trend chart.
10. Nüva Score / business health.

Some repetition is intentional for mobile orientation, but the overall information sequence risks becoming a long dashboard that asks users to scan the same facts several times.

**Recommendation:** redesign Resumen around three levels:
- **Now:** one executive result/status and one primary next action.
- **Monitor:** a small set of non-duplicated KPIs and the most relevant operational exceptions.
- **Investigate:** comparison, chart, detailed industry signals and Nüva Score, progressively disclosed or placed in focused views.

Keep source values and calculations unchanged. Remove only redundant presentation after checking real customer tasks and the intended role.

### F-03 — Desktop/mobile module discovery needs a second-level hierarchy
**Priority: P1 · Evidence: `src/components/dashboard-shell.tsx`, `src/lib/mobile-navigation.ts`**

The mobile navigation has a good four-destination bottom bar and a searchable “Más” sheet. However, all secondary modules are rendered as a long grouped list; section headings are not collapsible. On desktop, the selected section expands and can reveal up to seven finance entries together.

**Recommendation:** add collapsible groups to the mobile directory and introduce a small set of pinned/frequent destinations without changing the permission-filtered source list. Ensure every authorized route remains discoverable by search and direct URL.

### F-04 — Design direction is internally inconsistent across PR #312 documents
**Priority: P1 · Evidence: branch `feat/frontend-brand-foundation-2026-11`**

The pending design work does not currently express one consistent sidebar decision:
- `DESIGN.md` and `.impeccable.md` describe a near-black/dark navigation rail.
- `docs/design-research/NUVA-ONE-VISUAL-DIRECTION-2026-11.md` and `.interface-design/system.md` say the authenticated navigation rail remains white.
- The current `main` implementation in `src/nuva-brand-foundation.css` defines a white sidebar.

This is a design-governance conflict, not a reason to change the colors blindly.

**Recommendation:** establish one approved source of truth after visual comparison of the actual authenticated shell at desktop and mobile. Keep the pearl/light content canvas and separate public-site art direction. Update all design docs and semantic tokens together.

### F-05 — Notification affordance behaves like a placeholder
**Priority: P2 · Evidence: `src/components/dashboard-shell.tsx`**

The notification bell currently triggers a fixed “No tienes notificaciones nuevas” toast. It does not open a notification inbox or display a real unread state.

**Recommendation:** either connect it to a real notification center with unread count, empty/loading/error states and navigation to the affected record, or remove/de-emphasize the bell until that experience exists. A permanent-looking control should not imply a capability that is not available.

### F-06 — Profile control uses a hard-coded “U”
**Priority: P2 · Evidence: `src/components/dashboard-shell.tsx`**

The account trigger displays a literal “U”, rather than a user avatar or initials derived from the signed-in profile.

**Recommendation:** show the user's avatar or initials with an accessible name and a stable fallback. Do not add personal data to the visible header beyond what is necessary.

### F-07 — Resumen stylesheet has high cascade/maintenance complexity
**Priority: P2 · Evidence: `src/resumen-premium.css`**

The stylesheet is 2,086 lines / 68,595 bytes. Several component selectors recur across responsive contexts (for example KPI, shortcuts, panel headings, operational stats and filters). Repetition is not automatically a defect because media-query overrides can be intentional, but the file is expensive to reason about and increases regression risk.

**Recommendation:** after the visual hierarchy is approved, consolidate styles by component and breakpoint, remove obsolete overrides, and add visual regression coverage. Do not rewrite the stylesheet wholesale before establishing screenshot baselines.

### F-08 — Current route smoke does not certify authenticated UI
**Priority: P1 · Evidence: `scripts/nuva-agency-web-qa.mjs`, PR #383**

The latest QA expansion covers 30 paths and checks HTTP status, presence of an HTML document, viewport metadata and same-origin static assets. It also checks baseline headers and PWA assets. This is useful route/asset smoke coverage, but it does not sign in as a customer, assert that the intended authenticated component rendered, interact with controls, test keyboard/focus, capture screenshots or measure task completion.

**Recommendation:** add a separate authenticated browser suite using a dedicated demo account. Cover core tasks and states (new account, populated account, no permission, loading, empty, API error) at 320/360/390/430 px, tablet and desktop. Keep credentials in CI secrets; never place them in repository files or test artifacts.

## Existing strengths to preserve

- Role/module permission filtering in the shell; do not weaken it to simplify the menu.
- Explicit loading, error and no-membership states before showing restricted destinations.
- Mobile bottom navigation with four high-frequency destinations and a searchable secondary directory.
- Semantic authenticated tokens scoped by `body[data-nuva-surface="app"]`; public routes retain a separate visual system.
- Shared page primitives for headers, empty states, loading states and error/retry states.
- Mobile-first presentations already delivered for quotes, customers, inventory, cash, shifts, invoices and finance workflows. Avoid duplicating those efforts without a demonstrated gap.
- Business data calculations, payment logic, inventory invariants, RLS and permissions remain out of scope for presentation-only cleanup.

## Repository and release observations

- `main` is the default branch; the latest observed production deployment is READY on commit `6f721671`.
- PR #383 is merged. It expands route smoke coverage; it is not a visual UX certification.
- PR #312 remains open and Draft. Its branch is 196 commits ahead and 37 commits behind `main` (diverged). It changes 51 files and includes large Resumen, shell and CSS changes. **Do not merge it as-is.** Rebase or selectively port reviewed changes, then rerun the complete test suite and authenticated visual QA.
- The latest commit status showed Vercel success and `nuva-agency/ai-gateway-live` failure. The latter is not, by itself, proof of a frontend regression; investigate separately.
- Automated Codex review on PR #383 could not complete because of usage limits; the agency reviewer reported NEEDS_EVIDENCE. Do not describe that review as passed.

## Prioritized remediation plan

1. **P1 — IA simplification:** map routes to user jobs; consolidate related navigation without deleting functionality or changing permissions.
2. **P1 — Resumen hierarchy:** create a decision-first layout and remove duplicate presentation; preserve data calculations.
3. **P1 — Authenticated visual QA:** use a demo account and capture screenshots for key journeys at the target viewports; test controls, focus, empty/error/loading states.
4. **P1 — Design-system governance:** resolve the dark-vs-white sidebar conflict and publish one canonical direction.
5. **P2 — Product polish:** replace placeholder notifications and the hard-coded avatar.
6. **P2 — CSS consolidation:** refactor only after screenshot baselines and responsive acceptance tests exist.

## Acceptance criteria for the next implementation PR

- No authorized feature or route is removed.
- A new customer can identify the primary action and reach core daily tasks without scanning a long list.
- Resumen has no repeated headline metric or duplicated operational signal unless the repetition is intentionally role/device-specific.
- All routes remain permission-filtered; unauthorized users cannot discover restricted navigation items.
- Mobile “Más” groups can collapse, search works with accents, and every authorized route remains reachable.
- 320/360/390/430 px, tablet and desktop show no horizontal page overflow or clipped primary actions.
- Keyboard focus, touch targets, reduced motion, loading, empty, error and success states are validated.
- Typecheck, lint, tests, build and authenticated browser checks pass on the exact reviewed commit.
- Preview screenshots and the production deployment SHA are recorded separately.
