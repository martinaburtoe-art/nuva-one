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


### UX-001 — Mobile module search omitted the four persistent destinations
- Severity: P2 (navigation discoverability)
- Evidence: `src/lib/mobile-navigation.ts` excluded the primary mobile destinations before applying the search query, while the UI placeholder promised search across all modules.
- Impact: a user searching for “Resumen”, “Caja”, “Ventas” or “Inventario” could see no result inside the module directory, despite those modules being authorized and visible in the dock.
- Correction: keep the four primary destinations fixed in the dock when the query is empty; when the user searches, filter the complete authorized navigation set for the “Más” results.
- Regression coverage: updated `src/lib/mobile-navigation.test.ts` to verify that a primary destination is returned by search without changing the persistent dock.


### UX-002 — Account avatar used a hard-coded “U”
- Severity: P2 (personalization and account affordance)
- Evidence: `src/components/dashboard-shell.tsx` rendered a static “U” for every authenticated user.
- Impact: the account control did not reflect the signed-in identity and looked like unfinished template UI.
- Correction: derive up to two initials from the authenticated user's metadata/email, update on auth-state changes, and label the trigger for assistive technology. No full name or email is exposed in the header.

### UX-003 — Notification bell is a placeholder, not a notification center
- Severity: P2 (feature truthfulness)
- Evidence: the header button only fires a fixed “No tienes notificaciones nuevas” toast; no notification-center route was found in the inspected authenticated routes.
- Impact: it can falsely imply that a notification system has checked the business and found no alerts.
- Correction: replaced the misleading toast with an honest popover empty state that explicitly says automatic notifications are not connected yet and links to Resumen. No fake event data is shown.
- Remaining product gap: a real event source, role-aware notification model, unread state and delivery/read semantics are still required before this can be called a functional notification center.


### BUILD-001 — Duplicate dashboard test file was discovered as a route
- Severity: P3 (build hygiene)
- Evidence: Vercel's route-generation log warned that `src/routes/_authenticated/dashboard.test.ts` did not export a `Route`.
- Impact: unnecessary route-discovery warning and ambiguity about test files under the route tree.
- Correction: removed the duplicate test file; the expanded `-dashboard.test.ts` file already contains the dashboard-related test coverage and is excluded from route discovery by the configured prefix convention.
- Validation: latest Vercel build is running against the updated head; its final result is still pending.


## Validation snapshot

- Vercel preview build: PASS on code commit `39e3b882737116ee8a387a6dad77a6c00083ddc5`; deployment `READY`; URL: https://nuva-hzlg5pt69-martinaburtoe.vercel.app
- Route discovery: no remaining `dashboard.test.ts` route warning in that build.
- GitHub commit status: Vercel success. No TypeScript, unit-test or lint check is exposed for this head; do not infer those checks passed.
- GitHub autonomous reviewer: `NEEDS_EVIDENCE` because its configured provider was temporarily unavailable.
- PostHog connected project: no ingested product events and session recording is disabled; there is no behavioral evidence to interpret yet.
- Figma MCP: Starter-plan call limit reached before an editable visual concept board could be completed.
- Live and preview URLs are not accessible to the available web inspection session; authenticated visual QA remains unverified. The Vercel preview is protected by the project's SSO policy.

## Remaining validation

- Run typecheck, unit tests, lint and production build on the final PR head.
- Browser-test at 320/360/390/430 px, tablet and desktop.
- Test with an actual screen reader and keyboard-only navigation.
- Test reduced-motion on a real browser/device, including toast, dialog, dropdown, loading and route transitions.
- Inspect contrast, focus visibility, touch target dimensions, zoom/reflow and form error announcements.
- This report does not certify WCAG 2.2 AA conformance.
