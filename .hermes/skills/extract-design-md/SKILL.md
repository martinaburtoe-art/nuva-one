---
name: extract-design-md
description: Extract a source-grounded design system from the existing Nüva One frontend into DESIGN.md. Use when documenting or auditing actual colors, typography, spacing, components, layout and responsive conventions.
version: 1.0.0
---

# Extract DESIGN.md — Nüva One

Adapted as a Hermes-native project skill from Google Labs Stitch's extract-design-md workflow:
https://github.com/google-labs-code/stitch-skills/tree/main/plugins/stitch-design/skills/extract-design-md

## Goal
Read the actual frontend source and produce or update a root-level DESIGN.md that describes the design language already implemented. Do not invent a new design system and do not make source changes as part of extraction.

## Source inspection
1. Read repository instructions and identify the authenticated app shell, public surface boundaries and route groups.
2. Inspect Tailwind configuration, global CSS, authenticated token files, local page styles, typography/font imports and representative shared components.
3. Inspect the dashboard, navigation, cards, forms, dialogs/sheets, charts, tables and mobile navigation.
4. Trace scoped tokens and overrides. Distinguish app-level tokens from public-page styling and route-local styles.
5. Record values only when grounded in source. If a value varies by route or component, document the variation instead of forcing a single token.

## DESIGN.md structure
Create a concise but implementation-ready document with:
- Product surface boundaries and visual intent.
- Color palette with semantic roles and exact source values.
- Typography: font families, weights, type scale, line heights, tracking and numeric treatment.
- Spacing, layout grid, breakpoints, container widths and responsive rules.
- Shape, borders, elevation and shadows.
- Component patterns: navigation, cards, buttons, fields, dialogs/sheets, charts, tables, status/feedback.
- Interaction states, focus behavior, motion and reduced-motion behavior.
- Mobile-specific behavior and known exceptions.
- Source file map and known gaps / confidence notes.

## Nüva One constraints
- Authenticated app tokens are scoped under body[data-nuva-surface="app"] in src/nuva-brand-foundation.css.
- Resumen has local styles in src/resumen-premium.css under .nuva-resumen-canvas.
- Public pages have a separate visual direction. Do not mix their styles into the authenticated system.
- Existing brand anchors include product black #080809, pearl background #F3F3EF, white surfaces, Nüva indigo #6366F1 / accessible action token #595DDC, gold #E6C687, chart gold #B99A5D and muted gold text #80652E.
- Current source default typography uses Inter with system fallbacks. Record that as current state; do not replace it during extraction.
- Mobile verification targets are 320, 360, 390 and 430 px, plus tablet and desktop.

## Output and safety
- Write DESIGN.md only after completing source inspection.
- Do not modify CSS, components, package dependencies, routes, business logic, auth, payments, database or production settings.
- Mark unknowns as unknown; do not infer rendered appearance from source where browser evidence is required.
- Include a short source map so later edits can trace each token or pattern back to implementation.
