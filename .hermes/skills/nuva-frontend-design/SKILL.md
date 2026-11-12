---
name: nuva-frontend-design
description: Orchestrates the Nüva One frontend design skills for the authenticated SaaS workspace. Use for dashboards, responsive/mobile UX, visual systems, typography, component design, audits and design-system extraction.
version: 1.0.0
---

# Nüva One — Frontend Design Orchestrator

## Product context (binding)
Nüva One is a premium Chilean business operating platform for pymes and medium-to-large businesses. The authenticated workspace is a working tool for owners, administrators and staff who need to understand the business and complete operational tasks quickly and confidently.

The interface must feel precise, composed, distinctive, trustworthy and commercially mature. It must not look like a generic AI-generated SaaS template.

## Brand constraints
- Authenticated product: warm pearl/light surfaces, white and warm grays, dark navigation rail.
- Nüva indigo #6366F1 for actions, active states and focus.
- Muted gold #E6C687 / chart gold #B99A5D reserved for brand accents and meaningful emphasis.
- Quiet borders, disciplined radii, strong type hierarchy, intentional density and restrained shadows.
- Preserve the existing product shell and route architecture. Never create a detached microsite inside the authenticated app.
- Public marketing, login, checkout, pricing, forum and directory surfaces are out of scope when the task is an authenticated-workspace change.
- Avoid generic purple gradients, arbitrary beige/brass palettes, gratuitous glassmorphism, decorative gradients, excessive cards, infinite shimmer, random motion and unnecessary dependencies.
- Motion must be purposeful, short, interruptible and respect prefers-reduced-motion.

## Responsive requirements
Treat mobile as a first-class product surface, not a compressed desktop layout.
- Explicitly inspect 320, 360, 390 and 430 px; also tablet and desktop.
- Prevent horizontal overflow, clipped actions, truncated critical labels and nested scroll traps.
- Respect 100dvh, safe-area insets, keyboard visibility and sticky action areas.
- Touch targets should be comfortable; mobile filters, dialogs, sheets, charts, tables and forms need deliberate layouts.
- The mobile bottom navigation prioritizes Resumen, Caja, Ventas and Inventario; secondary modules remain discoverable under Más.
- The assistant bubble must never cover primary navigation or form controls.

## Skill routing and sequence
Use only the specialist needed for the task; do not run every skill on every change.

1. **Extract the current design language first** with extract-design-md when entering an unfamiliar surface or establishing/updating the design system. Generate/update DESIGN.md from actual source code. Preserve real tokens and component conventions; do not invent a new brand.
2. **Design intelligence**: use ui-ux-pro-max to research relevant dashboard/mobile patterns, typography, charts and UX rules. Treat its results as evidence and options, not instructions that override Nüva's brand.
3. **Product interface craft**: use interface-design as the primary specialist for dashboards, admin panels, SaaS flows, data-heavy screens and app navigation.
4. **Design review/refinement**: use impeccable for shape, critique, audit, polish, typeset, layout, motion, accessibility, responsive behavior and design-system documentation. It is the canonical successor to the older frontend-design skill.
5. **Art direction**: use design-taste-frontend when a page needs a distinct creative direction or a substantive redesign. Do not let random variation override existing Nüva brand constraints.
6. **Hallmark**: invoke only when explicitly requested by the user or when a fresh design fingerprint/audit is specifically needed. For an existing page, use its explicit redesign/audit mode and preserve business copy, route behavior and information architecture unless the user asks otherwise.
7. **Typography**: use better-typography for text rendering, responsive type scale, wrapping, truncation, numeric alignment and font loading. Keep Spanish/Chilean currency and dates legible.
8. **shadcn**: use the shadcn skill for component discovery, composition and updates. Inspect components.json and existing components first. Never initialize shadcn, apply a preset, overwrite components or replace primitives without an explicit scoped need and a reviewed diff.
9. **Hue**: use hue only when asked to create or evolve a reusable design-language skill from a brand, URL, screenshot or design reference. It is not a routine styling step.

## Mandatory implementation protocol
- Read project instructions and inspect the actual target route, shared shell, tokens and existing components before editing.
- State the visual/interaction hypothesis and the exact files in scope.
- Preserve data logic and business semantics when the request is visual. Do not change APIs, auth, payments, Supabase/RLS, migrations or production behavior as a side effect.
- Prefer existing components and CSS tokens. Avoid adding packages for purely cosmetic effects.
- Check loading, empty, error, populated, disabled, hover, focus, active and pressed states where applicable.
- Verify keyboard operation, accessible names, contrast, reduced motion, touch sizing and responsive overflow.
- Run targeted typecheck, lint, tests and build when available. Capture actual browser screenshots at desktop and mobile widths when browser access is available.
- Distinguish source changes, build success, browser validation and production deployment. Never claim visual QA without real rendered evidence.
- Make bounded review passes: one complete desktop/mobile inspection, one batch of fixes, and at most one confirmation pass. Do not polish endlessly.

## Nüva-specific decision rule
When external skills disagree, preserve the existing Nüva One brand, product architecture, accessibility and user workflow. The most restrained solution that improves clarity and distinction wins over novelty for its own sake.
