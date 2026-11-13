# Nüva One — Motion System

## Purpose
Motion must clarify state, hierarchy, continuity, or feedback. It must never conceal a control, delay a business operation, or communicate essential information without a static equivalent.

## Product principles
- Preserve the pearl/white, graphite, and indigo product identity.
- Prefer CSS transitions and compositor-friendly `transform` and `opacity`.
- Avoid animating layout dimensions, positional layout properties, large blurred layers, or full-screen decorative loops.
- Keep interactions interruptible and triggered by user intent.
- Respect the operating system's reduced-motion preference.
- Keep all business data and actions usable when motion is disabled.

## Timing and easing
Use the existing product tokens in `src/nuva-product-system.css`:
- Fast feedback: `--nuva-duration-fast` (160ms).
- Standard component transition: `--nuva-duration` (220ms).
- Slow, deliberate transitions: `--nuva-duration-slow` (320ms).
- Entry: `--nuva-duration-enter` (180ms).
- Primary easing: `--nuva-ease`.

## Motion patterns
| Pattern | Trigger | Treatment | Limit |
| --- | --- | --- | --- |
| Active navigation | Route change | Indigo state + short indicator reveal | One active item |
| Tap feedback | Pointer/touch down | Tiny scale response | Never delay action |
| Route entrance | New route content | Short opacity + 7px translate | No layout animation |
| Dialog/sheet | Open/close | Small opacity/scale transition | Preserve focus and escape behavior |
| KPI update | Confirmed data change | Brief number emphasis | Never imply fabricated intermediate values |
| Success feedback | Completed operation | One restrained confirmation pulse | One-shot only |
| Loading | Real pending request | Static skeleton or brief sheen | Stop when request resolves |

## Reduced motion
The `prefers-reduced-motion: reduce` mode disables spatial and decorative animation while retaining immediate color/state feedback. Content must remain visible in its final state; no workflow may depend on animation events to complete.

## Mobile requirements
- Touch targets remain at least 44px; bottom navigation targets are larger.
- Motion must not cover the bottom navigation, assistant, scanner, dialogs, or form controls.
- Safe-area insets must remain respected.
- Avoid hover-only feedback; every interaction has a touch and keyboard equivalent.
- Keep the UI responsive on mid-range Android devices and under constrained network conditions.

## Adoption roadmap
1. Navigation and route entry (foundation).
2. Resumen KPI, chart and period-filter state changes.
3. Sales, POS, inventory and scanner feedback.
4. CRM, quotes, finance and people workflows.
5. Onboarding, AI assistant and PWA update experience.

## QA checklist
- [ ] Android narrow viewport: no horizontal overflow or covered controls.
- [ ] Keyboard: visible focus and correct focus order.
- [ ] Reduced motion: no spatial animation; all content remains visible.
- [ ] Touch: feedback is immediate and action is not delayed.
- [ ] Loading/error/empty/success states are understandable without animation.
- [ ] No animation runs indefinitely without a user control.
- [ ] Production build and automated tests pass.

## Reference fidelity
The correct reference account is **[@moxen.studio](https://www.instagram.com/moxen.studio/)**, not @noxen.studio. The public profile and selected Reels were inspected through vidIQ on 2026-11-13. These notes distinguish observed behavior from inferred implementation and adapt the patterns to Nüva One rather than copying visual effects literally.

## Reference study: Instagram Reels de @moxen.studio

### 1. Estribo — contextual floating action bar
[Watch Reel](https://www.instagram.com/reel/DfromayBbxr/)
- Observed: a floating primary-action bar changes between expanded, compact/retracted, and hidden states according to scroll behavior and keyboard/form context.
- UX principle: the action dock should yield viewport space when the user scrolls quickly, focuses an input, or reaches a region where it would obstruct content.
- Nüva One application: only introduce a contextual bottom action dock for workflows that genuinely need a persistent primary action (e.g. a multi-step creation/edit flow). It must never compete with the global mobile navigation or cover form fields.
- Engineering guardrails: use viewport/scroll state carefully, clean up listeners, account for the virtual keyboard and safe-area insets, and preserve a minimum 44px interactive target even when visually compact. Hidden controls must not remain in keyboard tab order.

### 2. Fulgor — AI generation state machine
[Watch Reel](https://www.instagram.com/reel/DfqWROsBOnP/)
- Observed: an AI action progresses from idle, to a visible thinking/loading state, then expands an inline result panel with follow-up actions such as copy/regenerate.
- UX principle: make the system's state legible and keep the result in context rather than blocking the whole screen.
- Nüva One application: use this pattern for Nüva Intelligence / AI explanations and insight generation. The loading indicator must correspond to a real pending request; show a compact skeleton or restrained perimeter progress, then reveal the actual returned result.
- Engineering guardrails: expose `aria-busy`, `aria-expanded`, `aria-controls` and a polite status region as appropriate. Stop motion when the request resolves or fails. Never simulate token streaming or fabricate intermediate financial/business values. Provide retry and copy only when those actions are implemented.

### 3. Pastilla — action confirmation micro-interactions
[Watch Reel](https://www.instagram.com/reel/DfqRKBJhYr0/)
- Observed: distinct button states communicate progress/completion, saved state, sent state and a more expressive spring response. The Reel demonstrates label/icon transitions, a progress spinner, checkmark confirmation and a brief elastic press.
- UX principle: the control itself confirms what happened; the animation is a supplement to a clear state label.
- Nüva One application: apply restrained versions to real asynchronous actions such as report export, save, invoice send, or other confirmed operations. A saved toggle should expose its actual pressed state; a completed request should show a check and a clear completed label.
- Engineering guardrails: never show success before the server confirms success; prevent duplicate submissions with idempotency/pending state; use `aria-live="polite"` for status changes and `aria-pressed` for toggles. Keep the hit area stable while the visual layer animates. Reduced motion replaces spatial/spring motion with immediate state change or a short fade.

### Additional patterns identified in the public Reels list
- **Aplomo** describes protection against duplicate submission under repeated taps and unstable networks. This is a reliability pattern, not merely a visual effect: Nüva One must enforce pending-state locking and server-side idempotency for critical submit actions.
- **Estría / Vitrea / Esmalte / Pompa** explore glass, chrome, lacquer and refractive surfaces. These are visual experiments, not default dashboard treatments. Nüva One should retain its restrained pearl/graphite/indigo system and avoid heavy filters, continuous pointer tracking or expensive blur on mid-range Android devices.
- **Cursores** presents multiple named cursors acting together. This may inform future collaboration indicators only if Nüva One has real concurrent editing/presence; do not imply live collaboration where none exists.

## Decisions for Nüva One
1. Prioritize functional motion over decorative motion: every transition must communicate a real state or improve a real workflow.
2. Keep the visual identity premium and restrained; borrow interaction logic, not the source studio's gradients, colors, chrome or playful physics wholesale.
3. Keep contextual controls close to the action that invokes them. A floating dock is conditional, never a second global navigation.
4. AI feedback must represent actual request lifecycle states and display returned data only.
5. Submission feedback must be coupled to duplicate-submit protection and authoritative server outcomes.
6. All motion must respect `prefers-reduced-motion`, keyboard navigation, screen readers, stable touch targets and Android performance.
7. No new animation may conceal errors, invent financial progress, or make a nonfunctional control appear functional.


## Extended profile and public resource-library audit — 2026-11-13

### Profile snapshot
The public Instagram profile returned by vidIQ identifies `@moxen.studio` as a software-development studio offering custom web/mobile development, UI/UX, ERP/CRM and AI. Snapshot at review time: approximately 8.3K followers and 737 posts. These counts are a dated snapshot, not a permanent metric.

### Coverage and evidence limits
- The profile Reels endpoint returned 12 items from the first Reels-tab page, with pinned items first and then newer items. It is not a full-account archive or a performance ranking.
- Four Reels have been deeply inspected: Estribo, Fulgor, Pastilla and Aplomo.
- The remaining eight Reels are represented here from returned captions/metadata only. They have not been scene-by-scene inspected because the connected vidIQ account had no remaining analysis credits. Do not treat their implementation details as verified.

### Reels page inventory — 12 returned items
| Reel / concept | Returned caption signal | Nüva One inspiration / disposition |
| --- | --- | --- |
| [Lumbre](https://www.instagram.com/reel/Dfr4GDnBjJd/) | AI assistant represented as a chrome sphere that listens, thinks, searches, speaks and signals errors | Consider a restrained assistant status indicator only if it maps to real listen/process/respond/error states; avoid decorative 3D orb as a permanent dashboard element |
| [Cursores](https://www.instagram.com/reel/Dfry_HSBPso/) | Three named cursors activate, type and comment together | Future collaboration/presence pattern only when concurrent editing and identity are real |
| [Estría](https://www.instagram.com/reel/Dfrtwz1hU9C/) | Vertical glass-like striations reveal/brighten an image on hover | Not for core dashboard; possible marketing/landing-page visual only, with touch alternative |
| [Estribo](https://www.instagram.com/reel/DfromayBbxr/) | Mobile CTA expands, retracts on fast scroll and yields to keyboard | Deeply inspected; see above |
| [Vitrea](https://www.instagram.com/reel/DfropNaBMTx/) | Chrome typography responds to cursor lighting and changing text | Marketing-only art direction; avoid expensive pointer tracking in operational UI |
| [Esmalte](https://www.instagram.com/reel/Dfrjg6Kh6ZV/) | Lacquer-like button reflects cursor, presses inward and indicates loading | Borrow explicit pressed/loading feedback, not reflective material treatment |
| [Aplomo](https://www.instagram.com/reel/DfrjfJehv4q/) | Submit control resists repeated taps and unstable-network duplicate submissions | Deeply inspected; treat as reliability requirement: pending lock plus backend idempotency, not animation alone |
| [Pompa](https://www.instagram.com/reel/DfreWVkBTPZ/) | Soap-like buttons/search/menu/toggle distort and refract the background | Experimental visual only; reject for dense data UI due distraction, readability and GPU cost |
| [Enganche](https://www.instagram.com/reel/DfreWx5hhSX/) | Two-piece action button moves an arrow along a track and docks into a checkmark | Possible restrained completion affordance for a real multi-step action; static label/check must communicate same result |
| [Tándem](https://www.instagram.com/reel/DfqbYhIBBFu/) | Primary action button opens alternatives from an attached chevron with spring motion | Strong candidate for contextual action split-buttons where there is one primary action and a small set of safe alternatives |
| [Fulgor](https://www.instagram.com/reel/DfqWROsBOnP/) | AI button shows a perimeter light, thinking state, then reveals generated content | Deeply inspected; see above |
| [Pastilla](https://www.instagram.com/reel/DfqRKBJhYr0/) | Download/progress/success, save toggle, send animation and spring CTA | Deeply inspected; see above |

### Aplomo — duplicate-submit protection
[Watch Reel](https://www.instagram.com/reel/DfrjfJehv4q/)
- Observed claim: the submit button is designed to withstand repeated taps and unstable network conditions without creating the same order twice.
- Nüva One priority: apply this principle to sales, quotations, purchases, payment/checkout, invoice sending and other mutation workflows where duplicate requests create real business harm.
- Required implementation layers: immediate client pending state and disabled/re-entry guard; stable idempotency key per logical operation; server-side uniqueness/idempotency enforcement; safe retry semantics; clear success/error outcome based on authoritative response.
- Visual feedback is secondary. A spinner alone does not prevent duplicates, and client-only disabling is insufficient.

### Tándem — primary action with safe alternatives
[Watch Reel](https://www.instagram.com/reel/DfqbYhIBBFu/)
- Caption-level observation: a primary button exposes related alternatives from a chevron with a spring-like reveal.
- Nüva One candidate: use for a toolbar action with a clear default, e.g. create a quote with secondary options to create from template/import, only where those routes/actions already exist.
- Guardrails: keep the primary action directly executable; menu items must be keyboard-operable, accessible and not hide destructive actions among routine choices. Use restrained 160–220ms transitions.

### Public website and resource library
Sources: [Moxen homepage](https://moxen.cl/), [Moxen free resources](https://moxen.cl/recursos.html), [management systems service](https://moxen.cl/servicios/sistemas-de-gestion/), [AI service](https://moxen.cl/servicios/inteligencia-artificial/), [web/mobile service](https://moxen.cl/servicios/paginas-web/).
- The website positions Moxen around operational software built from understanding a company's workflow, with inventory, warehouses, sales/orders, production/services, integrations, reporting and role-based access.
- Its public resource library lists a broad set of named UI patterns, including cards (Baraja, Perfil, Inercia, Vidrio), cursor effects (Aspa, Estela, Aumento, Barra, Negativo, Chispas), backgrounds (Retícula, Aurora, Constelación, Grano, Ondas, Lluvia), scroll (Lectura, Aparición, Capas, Cruce, Pila), notifications (Pila, Campana, Globo), generative visuals (Ramaje, Mercurio, Meandro, Cota, Bandada, Púlsar and others), lists (Hilera, Escalafón, Desliz, Tablero, Bitácora, Desglose, Hallazgo, Racimo, Raíces, Podio), image/video treatments, section reveals, diagrams, text effects, charts, buttons (Mérito), forms (Turno, Horquilla, Dígito, Comuna), navigation (Repliegue, Atajo, Cajón), system components (Traspaso, Charla, Despacho, Armazón, Guardia) and loaders (Faena).
- This is a catalog of available resource names/categories, not proof that every effect is used on Instagram or suitable for Nüva One. Each resource must be inspected and licensed/implemented according to its own terms before use.
- The library FAQ states resources are supplied as HTML/CSS/JS with README and license; they are not unrestricted assets to repackage or resell. Nüva One should implement original equivalents rather than copying source code or branding.

### Priority matrix for Nüva One
| Priority | Pattern | Target modules | Why |
| --- | --- | --- | --- |
| P0 | Duplicate-submit prevention (Aplomo principle) | Sales, quotes, purchases, checkout, invoice sending | Prevents duplicate business mutations |
| P1 | Contextual AI state machine (Fulgor principle) | Nüva Intelligence, business explainer, Resumen insights | Makes real AI request lifecycle understandable |
| P1 | Contextual action split-button (Tándem principle) | Resumen toolbar, create flows | Faster access to related actions without clutter |
| P1 | Contextual mobile action dock (Estribo principle) | Long create/edit workflows | Keeps primary action reachable without obstructing keyboard/content |
| P2 | Inline action confirmation (Pastilla/Enganche principle) | Export, save, send, complete | Clear, immediate and trustworthy feedback |
| P3 | Presence cursors (Cursores principle) | Future collaborative workflows | Only valuable with true realtime presence |
| P4 | Glass/chrome/soap visual experiments | Marketing/landing page only | Too decorative/heavy for daily operational dashboard |

### What this audit does not establish
- It does not prove that all 737 Instagram posts or all historical Reels have been reviewed.
- It does not include frame-by-frame inspection of all 12 returned Reels; only four named deep analyses are scene-level reviewed.
- It does not establish production performance, accessibility compliance or implementation details of Moxen's own source code unless directly visible.
- It is a design-research input, not authorization to copy proprietary assets or ship untested interaction changes.
