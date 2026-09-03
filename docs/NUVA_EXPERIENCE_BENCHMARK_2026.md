# Nüva One — Experience Benchmark 2026

## Purpose

This document locks the evidence-driven visual direction for the premium experience layer. It complements, and does not replace, the existing Nüva design tokens, product logic, security model, or Quality Gate.

## Research set

### MotionSites
Role: motion-language and marketing-site composition.

Adaptable patterns:
- cinematic hero composition with one dominant visual thesis
- scroll-driven narrative progression
- controlled parallax/depth
- transitions used to establish hierarchy

Nüva adaptation:
- one memorable hero motion system rather than motion on every element
- section reveals that preserve reading speed
- no scroll hijacking

### Refero
Role: real product screens, UX patterns, and complete flows. Refero explicitly separates styles, screens, and flows; its library covers dashboards, landing pages, onboarding, billing, AI chat, tables, navigation, 3D illustrations and animation.

Nüva adaptation:
- use screens for dashboard/CRM/inventory patterns
- use flows for onboarding and signup
- use real-product patterns as the structural baseline before decorative motion

### Refero Styles
Role: visual direction and design-system evidence.

Nüva adaptation:
- preserve Nüva's existing brand tokens
- refine typography hierarchy, surface depth, spacing rhythm and accent discipline rather than replacing the palette wholesale
- record every major visual decision in the decision ledger

### Mobbin
Role: mobile-first interaction patterns, onboarding, navigation, states and task flows.

Nüva adaptation:
- mobile interactions must remain thumb-friendly
- transitions must not interfere with native scrolling or scanner interactions
- use mobile evidence to validate responsive behavior, not merely desktop layouts scaled down

## Decision ledger

| Decision | Source | Source role | Nüva decision |
|---|---|---|---|
| Hero | MotionSites + premium SaaS references | cinematic hierarchy | one focal motion scene, lazy loaded, static fallback |
| Landing rhythm | MotionSites | scroll storytelling | reveal groups + restrained depth, no scroll hijacking |
| Product structure | Refero Screens | proven UI patterns | preserve operational clarity; motion adds hierarchy only |
| Onboarding | Refero Flows + Mobbin | journey logic | progressive disclosure, visible progress, fast feedback |
| Mobile UX | Mobbin | mobile interaction | native scroll/list behavior remains authoritative |
| Typography/surfaces | Refero Styles | visual language | evolve current Nüva tokens; avoid arbitrary redesign |
| Microinteraction | product evidence + functional need | feedback | use motion only for state change, confirmation or orientation |

## Motion architecture

1. CSS remains the zero-dependency baseline.
2. `CinematicReveal` is the lightweight primitive for viewport entry.
3. GSAP/ScrollTrigger is reserved for coordinated timelines where CSS is insufficient.
4. Lenis is only considered for public narrative pages and only after native-scroll/accessibility/performance validation.
5. Anime.js is optional and only for isolated microinteractions if its incremental bundle cost is justified.
6. Three.js/Spline are never on the critical rendering path; use lazy loading, capability checks and a static/2D fallback.
7. Barba.js is not assumed: TanStack Router remains the navigation authority unless an equivalent transition layer is proven compatible.

## Hard gates

- `prefers-reduced-motion`: mandatory.
- No animation of layout-critical properties when transform/opacity can be used.
- No horizontal overflow at 320/390/768/1024/1440 px.
- No motion dependency in billing/payment/RLS/server authorization.
- Every new dependency requires lockfile update, audit, build, browser gate and bundle-impact evidence.
- No 3D asset may block LCP.
- No smooth-scroll layer may capture or break internal scroll containers.

## Stage matrix

| Stage | Control | Priority | Evidence | Test | State |
|---|---|---:|---|---|---|
| Landing | visual hierarchy | P0 | MotionSites + Refero | Browser Gate + visual QA | Planned |
| Landing | hero fallback | P0 | performance architecture | mobile/low-capability test | Planned |
| Landing | scroll storytelling | P1 | MotionSites | reduced-motion + overflow | Planned |
| Transition | router-safe page transition | P1 | TanStack Router architecture | E2E navigation | Planned |
| Demo | guided motion | P0 | Refero/Mobbin patterns | Browser + interaction tests | In progress |
| Dashboard | metric entrance motion | P1 | Refero dashboard patterns | visual regression/perf | Planned |
| Dashboard | microinteraction feedback | P1 | Mobbin/Refero | component tests | Planned |
| Accessibility | reduced motion | P0 | WCAG-aligned implementation | axe + browser | Required |
| Performance | bundle/CWV | P0 | engineering evidence | build + Lighthouse/WebPageTest | Required |

## Research principle

The goal is not to reproduce another website. The goal is to combine proven product patterns with a distinct Nüva visual language so the experience feels authored, premium and coherent rather than template-generated.
