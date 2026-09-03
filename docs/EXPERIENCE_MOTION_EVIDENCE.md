# Nüva One — Experience Motion Evidence

## Stage 1 — Interactive demo foundation

| Control | Priority | Evidence | Test | Estado |
|---|---|---|---|---|
| Reduced motion | P0 | `CinematicReveal` checks `prefers-reduced-motion` and removes transition/transform | Browser Gate + manual accessibility check | Implemented |
| Viewport reveal | P1 | IntersectionObserver reveals content only when entering viewport | Playwright landing/browser suite | Implemented |
| Compositor-friendly motion | P1 | Uses `opacity` + `transform: translate3d()`; no layout properties animated | Browser inspection + performance review | Implemented |
| Critical flows isolation | P0 | Motion primitive is used by `/demo`; no billing/RLS/payment code imports it | Repository audit | Implemented |
| Mobile-safe timing | P1 | Short 700ms reveal with bounded translation; no scroll hijacking | Browser Gate viewports | Implemented |
| Bundle discipline | P0 | No new runtime animation dependency added to the critical path in this stage | `package.json` dependency audit | Passed |

## Design north stars

- Active Theory: immersive interaction should remain engineered around performance and graceful capability degradation.
- Awwwards/Locomotive ecosystem: use motion to establish hierarchy and narrative rather than decorating every component.
- GSAP: reserved as the next dedicated sequencing layer once dependency-lock installation can be validated end-to-end; current stage deliberately avoids introducing an unverified dependency into a production-green branch.

## Architecture decision

The existing application has no GSAP/Lenis/Anime.js/Three.js dependency in `package.json`. Because the repository uses a committed `package-lock.json` and `npm ci` in CI, this stage does **not** add libraries by editing only `package.json`. A dependency is considered production-ready only after its lockfile, build, audit, browser gate, and bundle impact are validated together.
