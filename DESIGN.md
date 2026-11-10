# Nüva One — Design System

> Source of truth for the authenticated business workspace. This records the system evidenced in the current codebase; it does not replace the existing brand.

## Product context
Nüva One is an operational workspace for Chilean SMEs and growing businesses. Owners, administrators and staff use it for sales, POS, inventory, purchases, cash, finance, customers, fulfilment and business intelligence. The interface must make business state legible and help people complete consequential work accurately.

## Brand direction
- **Character:** precise, assured, calm, distinctive and commercially credible.
- **Authenticated workspace:** warm pearl and soft neutral surfaces, clean white panels and warm grays.
- **Navigation anchor:** near-black rail with warm-white typography and restrained gold detail.
- **Action/focus:** Nüva indigo `#6366F1`; accessible primary `#595DDC`.
- **Brand accent:** muted gold `#E6C687`; chart gold `#B99A5D`. Gold is an accent, not a default text/action color.
- **Public site:** retains its separate dark/editorial art direction. Do not force authenticated tokens onto marketing, auth or checkout pages.

## Semantic tokens
Authenticated tokens are scoped to `body[data-nuva-surface="app"]` in `src/nuva-brand-foundation.css`. Prefer semantic variables over hard-coded module colors.

| Role | Value |
|---|---|
| App background | `#F3F3EF` |
| Foreground | `#17191B` |
| Card / popover | `#FFFFFF` |
| Primary action | `#595DDC` |
| Brand indigo | `#6366F1` |
| Gold accent | `#E6C687` |
| Accessible muted gold | `#80652E` |
| Muted foreground | `#686D72` |
| Secondary / muted | `#EBECE8` / `#ECEDE9` |
| Destructive / success / warning | `#A94E48` / `#39745B` / `#946B32` |
| Sidebar / foreground | `#080809` / `#F4F1E9` |

### Shape, elevation and timing
The authenticated product system in `src/nuva-product-system.css` defines control/surface/panel radii of 10/14/18px and fast/standard/slow motion of 160/220/320ms. Use quiet borders and low-contrast shadows. Interactive surfaces may receive subtle border, background and elevation feedback; avoid large lifts, glowing panels and decorative glass effects.

## Typography and hierarchy
- Tailwind theme uses Inter with system fallbacks.
- Use sentence case for headings and controls; reserve uppercase tracked labels for short kickers.
- Use tabular numerals for CLP amounts, quantities, dates and KPIs.
- Each screen needs one clear title, concise context and a visually dominant primary action.
- Separate primary values from comparisons, metadata and status through weight and contrast, not a proliferation of colors.
- Never present fabricated metrics or placeholder activity as live business data.

## Application shell
The authenticated shell is `src/components/dashboard-shell.tsx`.
- Dark navigation rail anchors the workspace.
- Navigation is grouped by operational purpose and filtered by membership role/module permission.
- Preserve active-route feedback, collapsed navigation, mobile sheet, business switcher, global search and module search.
- Module screens must not invent competing navigation patterns.

## Module composition
1. **Page header:** title, short context and one primary action.
2. **Decision summary:** only metrics/state needed to orient the user.
3. **Working surface:** table, list, form, chart or operational workflow.
4. **Secondary actions:** contextual, permission-aware and subordinate.
5. **Feedback:** explicit loading, empty, error, stale and success states.

Do not turn every metric/action into an equal-sized card. Use tables for comparison and bulk work, focused forms for data entry, timelines for lifecycle state, and charts only when they improve a decision.

### Resumen
Implemented in `src/routes/_authenticated/dashboard.tsx` and `src/resumen-premium.css`. It uses a pearl canvas, restrained borders, editorial heading, onboarding/operational feedback, KPIs and lazy-loaded chart content. It is the executive orientation surface, not a duplicate navigation menu or wall of generic cards.

### Caja / POS
The POS is a high-frequency, high-consequence workflow. Keep the payment action fully visible and reachable on compact screens without covering cart totals or the final line item. Product search, cart editing, customer, payment method, amount received/change and receipt confirmation must remain one coherent flow. Presentation changes must not alter payment or stock business logic.

## Interaction and motion
The system in `src/nuva-motion-system.css` uses motion to communicate entry, hierarchy, state and spatial continuity.
- Prefer short, meaningful transitions (roughly 140–240ms).
- No infinite shimmer, ambient animation or motion that disguises loading.
- Hover feedback is for fine pointers; touch must work without hover.
- Provide visible keyboard focus and logical tab order.
- Honor `prefers-reduced-motion`; content remains understandable without animation.
- Disabled, pending and destructive states must be explicit and not rely on color alone.

## Responsive and accessibility contract
Treat 320, 360, 390 and 430px as first-class widths, then tablet and desktop.
- No horizontal page overflow or clipped primary actions.
- Aim for touch targets of at least 44px.
- Respect safe areas and dynamic viewport height.
- Sticky actions must not cover content, validation or keyboard-focused fields.
- Tables need intentional mobile behavior, not accidental clipping.
- Dialogs, sheets, popovers and menus must work with touch, keyboard and assistive technology.
- Maintain sufficient contrast, visible focus and semantic labels.
- Test empty, loading, error, long-text, large-number and permission-restricted states.

## Data integrity in the interface
- Never show zero as “no activity” when the query failed.
- Keep independent data sections independently recoverable where possible.
- Show stale/last-updated context when it changes decisions.
- Empty states explain what is missing and provide a valid next step.
- Errors identify the affected module and offer safe retry.
- Financial/destructive actions state their scope and produce a clear outcome.

## Engineering constraints
- Stack evidenced in `package.json`: React 19, TypeScript, Vite, TanStack Router/Start, Tailwind CSS v4, Radix primitives, TanStack Query, Supabase, Recharts and Capacitor.
- Tailwind v4 is integrated through `@lovable.dev/vite-tanstack-config`; `vite.config.ts` exists. Do not add duplicate plugins or legacy Tailwind configuration.
- Reuse `src/components/ui`; do not wholesale-replace the component system.
- Avoid new dependencies without a demonstrated need.
- Keep business rules, Supabase access control, payments and inventory invariants out of presentation-only changes.
- Keep public/editorial styling separate from authenticated product tokens.

## Anti-patterns
Generic AI dashboard gradients; glowing cards; repeated equal-card grids; default glassmorphism; oversized headings that push work below the fold; decorative charts or fake activity; placeholder actions; clipped payment controls; hover-only functionality; color-only status; motion that ignores reduced-motion settings.

## Definition of done
A UI change is complete only when:
1. The task works end-to-end with real data and permissions.
2. Loading, empty, error, stale, success and disabled states are handled.
3. No action, amount, label, table column or validation message clips at 320–430px, tablet or desktop.
4. Keyboard, touch and reduced-motion behavior are preserved.
5. Financial, payment, inventory and access-control logic remains unchanged unless separately reviewed.
6. Typecheck, lint, relevant tests and production build pass.
7. Browser-based visual/functional checks are recorded on mobile and desktop. Static source inspection is not visual QA.
