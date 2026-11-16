# Nüva One — static accessibility review findings

Date: 2026-11-16
Scope: source inspection of the authenticated shell and route files on `feat/nuva-fluid-motion-20261116`.
This is a static code review, not a browser-based WCAG audit.

## Findings corrected in this branch

### A11Y-001 — Nested main landmark in Resumen
- Severity: P2 (screen-reader landmark semantics)
- Evidence: `src/components/dashboard-shell.tsx` renders the authenticated page's `<main>`; `src/routes/_authenticated/dashboard.tsx` also rendered a second `<main className="nuva-resumen-canvas">` inside it.
- Impact: nested main landmarks are invalid/ambiguous landmark structure and can make navigation by landmarks less predictable for assistive-technology users.
- Correction: changed the inner Resumen wrapper to a `<div className="nuva-resumen-canvas">`. The shell remains the single main landmark.
- Static verification: the nine other primary authenticated route files inspected (analytics, customers, finance, inventory, Nüva Intelligence, People, POS, Quotes and Sales) contained no additional `<main>` tags.

### A11Y-002 — Reduced-motion override did not cover portalled UI and all interaction transforms
- Severity: P2 (motion accessibility)
- Evidence: the previous override was scoped to `.nuva-app`, while the root renders Sonner `<Toaster>` separately; the legacy motion system also moves passive rounded cards and table rows on hover.
- Impact: a reduced-motion preference could leave motion active in portalled notifications or retain hover translations on passive data surfaces.
- Correction: expanded the reduced-motion animation/transition suppression to the authenticated body surface (including portalled UI); disabled hover/press transforms on interactive controls, rounded cards and table rows while preserving transforms used for layout.
- Additional correction: table row hover now changes only its background; it no longer slides horizontally.

## Remaining validation

- Run typecheck, unit tests, lint and production build on the final PR head.
- Browser-test at 320/360/390/430 px, tablet and desktop.
- Test with an actual screen reader and keyboard-only navigation.
- Test reduced-motion on a real browser/device, including toast, dialog, dropdown, loading and route transitions.
- Inspect contrast, focus visibility, touch target dimensions, zoom/reflow and form error announcements.
- This report does not certify WCAG 2.2 AA conformance.
