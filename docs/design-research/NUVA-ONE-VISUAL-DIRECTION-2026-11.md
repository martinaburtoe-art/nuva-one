# Nüva One — Visual research & frontend direction
Date: 2026-11-10
Scope: authenticated product workspace, with Resumen (/dashboard) as the first implementation target.
Status: research translated into implementation criteria; this document is not a claim that every pattern is already shipped.

## Design thesis
Build a distinctive enterprise SaaS interface: calm, precise, data-first, responsive, and tactile. Preserve Nüva One's pearl/light workspace direction and existing brand anchor. Do not turn Resumen into a marketing landing page, do not copy gallery sites, and do not introduce decorative motion that delays operational work.

## Source extraction: what each reference contributes

| Source | Useful design signal | Application to Nüva One | Guardrail |
|---|---|---|---|
| Minimal.gallery | Restrained composition, whitespace, clean functional layouts; category-based curation | Reduce visual noise, align card rhythm, strengthen hierarchy and empty states | Minimal does not mean hiding important business data |
| Darkmodedesign.com | Contrast, dark surfaces, restrained accent use | Study contrast and depth for sidebar, overlays, charts and optional dark surfaces | Keep Resumen's approved pearl/light canvas; no forced dark redesign |
| Land-book.com | Whole-page structure and section-level patterns | Audit information sequence: executive summary → key metrics → operational status → trends → actions | Landing-page storytelling must not displace task-first product navigation |
| OnePageLove.com | Section library, CTA and content hierarchy patterns | Improve focused actions, section titles, progressive disclosure and responsive patterns | Avoid long promotional one-page behavior inside an operational dashboard |
| FontsInUse.com | Typography shown in real editorial and brand contexts | Define a deliberate type scale, tabular numerals for KPIs, readable body text and consistent weights | Do not add font files or change brand typography without checking licensing, loading and existing tokens |
| Httpster.net | Typographic confidence, minimal/brutalist composition, strong art direction | Use selective typographic contrast and concise labels for section hierarchy | Avoid brutalist novelty that harms scan speed or accessibility |
| Lapa.ninja | Landing-page examples, full-page composition and visual storytelling | Study strong first-screen hierarchy, concise copy and clear primary actions | Do not transplant marketing hero patterns into every internal module |
| Bestwebsite.gallery | Curated standout sites and art direction | Benchmark craft, alignment, spacing, image treatment and details | Use as quality benchmark, not a template |
| Designmadeingermany.de | Curated studio, interface and visual-design work | Favor disciplined grids, precise typography, editorial restraint and craft | Avoid aesthetic flourishes without a product purpose |
| Hoverstat.es | Experimental interaction, navigation and content behaviors | Borrow subtle, meaningful hover/focus feedback and state transitions | No cursor gimmicks, hidden controls or motion-only affordances |
| Landing.love | Full-page recordings and section animation references | Study timing and movement by section; use short transitions for panel, filter and chart states | Avoid heavy 3D/WebGL/scroll hijacking in the business workspace |
| Siteinspire.com | Curated design across styles, subjects and grid systems | Benchmark navigation, content density, grid composition and responsive structure | Preserve predictable app navigation and task continuity |

## Nüva One design system decisions

### 1. Visual foundation
- Primary workspace: pearl/white/light neutral surfaces. Preserve the current white navigation rail and white top bar; do not introduce a dark sidebar into this authenticated shell.
- Accent hierarchy: Nüva indigo for interactive/selected states; restrained gold for financial emphasis and secondary highlights; semantic success/warning/error colors remain semantic.
- Borders and shadows: low-contrast borders, shallow elevation, consistent radii; avoid stacking multiple heavy shadows.
- Typography: one coherent family from the existing app tokens; clear display/section/body/metadata scale; tabular numerals for monetary and count values.
- Density: enterprise information density with clear grouping and sufficient whitespace, not oversized marketing cards.

### 2. Resumen information architecture
1. Page identity and period context.
2. Financial headline (real net result with income/expense context).
3. Supporting KPIs without duplicating the headline metric.
4. Operational health and next actions.
5. Trend chart with filters, useful loading/empty/error states.
6. Secondary module shortcuts only where they add navigation value.

### 3. Responsive behavior
- Treat 320, 360, 390, 430 px as explicit acceptance widths, plus tablet and desktop.
- Components reflow based on available component width (container queries where supported), not only viewport breakpoints.
- No horizontal page overflow; labels and CLP values must wrap or scale safely.
- Touch targets should be at least 44 px where practical; focus indicators must remain visible.
- Respect safe-area insets and reduced-motion preferences.
- On mobile, prioritize reading order and task actions over preserving desktop columns.

### 4. Interaction and motion
- Use short, purposeful transitions for hover, focus, pressed, selected, filter changes and panel state changes.
- Every interaction must also work without hover and with keyboard/touch.
- Prefer opacity/transform and avoid layout-thrashing animation.
- Respect prefers-reduced-motion; no autoplay motion that competes with financial data.
- Keep loading, empty, error and success states visually distinct and truthful.

### 5. Data visualization
- CLP formatting must be consistent in KPI, axes and tooltip.
- Use color plus labels/legend; never encode meaning only by color.
- Empty chart state must distinguish no transactions from query failure.
- Keep axes legible on small screens and avoid clipping tooltips/labels.
- Never fabricate trend data or infer operational status from missing values.

## Implementation sequence
1. Finish and validate the existing Resumen work in PR #312 before adding visual scope.
2. Perform authenticated screenshot review at 320/360/390/430 px, tablet and desktop.
3. Correct overflow, density, type scale, card rhythm, filter placement, touch targets and states based on screenshots.
4. Extract shared tokens/components only after verifying they fit the authenticated shell; then propagate to Caja, Inventario, Finanzas and CRM in separate controlled scopes.
5. Add motion selectively after interaction tests and reduced-motion verification.

## Acceptance criteria
- No duplicated headline KPI or repeated home/dashboard content.
- No horizontal overflow at the target widths.
- Financial values, filters and date ranges remain accurate.
- Every interactive control has visible hover/focus/pressed/selected feedback and works on touch/keyboard.
- Loading, empty and error states are distinct.
- Resumen visually belongs to the authenticated Nüva One workspace.
- Build, typecheck and relevant tests pass on the exact reviewed commit.
- Preview screenshot and production deployment SHA are recorded separately; a successful Vercel status alone is not visual QA.

## Reference URLs
- https://minimal.gallery/
- https://www.darkmodedesign.com/
- https://land-book.com/
- https://onepagelove.com/
- https://fontsinuse.com/
- https://httpster.net/
- https://www.lapa.ninja/
- https://bestwebsite.gallery/
- https://www.designmadeingermany.de/
- https://www.hoverstat.es/
- https://www.landing.love/
- https://www.siteinspire.com/
