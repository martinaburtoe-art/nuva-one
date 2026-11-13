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
