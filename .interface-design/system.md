# Nüva One — Interface System

This file is the product-interface contract for authenticated Nüva One screens. It complements the source-derived DESIGN.md and must not be treated as permission to redesign the brand.

## Surface boundaries
- Authenticated workspace tokens are scoped to body[data-nuva-surface="app"] in src/nuva-brand-foundation.css.
- Public pages have a separate art direction. Do not leak authenticated token overrides into public routes.
- Resumen has local presentation rules in src/resumen-premium.css under .nuva-resumen-canvas.

## Color roles
- Product black: #080809. Use for the authenticated navigation rail and deep anchors.
- Pearl canvas: #F3F3EF. Primary app background.
- Surface: #FFFFFF. Cards, dialogs and elevated work areas.
- Main text: #17191B. Secondary text: #686D72.
- Primary action: #595DDC. Accessible action variant; the brand indigo reference is #6366F1.
- Brand gold: #E6C687. Restrained brand accent, not a default text color on light surfaces.
- Accessible muted gold: #80652E. Use where gold text must be readable on pearl/white.
- Chart gold: #B99A5D.
- Borders: rgba(23,25,27,.11); inputs rgba(23,25,27,.15).
- Semantic states: destructive #A94E48, success #39745B, warning #946B32.

## Typography
- Current source default: Inter with system fallbacks. Do not replace globally without a measured typography review and font-loading/performance check.
- Use clear role-based hierarchy, restrained tracking, readable line-height and deliberate line lengths.
- Financial values and tabular data use tabular numerals and stable alignment.
- Avoid tiny uppercase labels for critical content; preserve readability at 320–430 px.
- Spanish labels, Chilean CLP values and dates must wrap and truncate without losing essential meaning.

## Layout and density
- Reuse the existing authenticated app shell and module patterns.
- Prefer one clear focal point per view, then supporting information in deliberate groups.
- Use operational density when it improves decisions; avoid decorative card grids.
- Keep surfaces flat and quiet. Shadows are reserved for meaningful elevation, not every container.
- Use existing radius tokens and control dimensions; avoid introducing a second competing radius scale.

## Interaction and accessibility
- Focus-visible uses the Nüva indigo ring with a visible offset.
- Keep keyboard access, semantic labels, clear disabled/loading/error states and sufficient contrast.
- Use short state transitions only; honor prefers-reduced-motion.
- Coarse pointers must not depend on hover.
- Mobile controls must respect safe areas, keyboard height, dynamic viewport and touch targets.

## Responsive contract
- Explicit test widths: 320, 360, 390, 430 px, tablet and desktop.
- No horizontal page overflow, clipped primary actions or inaccessible hidden content.
- Convert wide filter rows, tables and charts into mobile-specific layouts rather than scaling desktop controls down.
- Sheets and dialogs need contained scrolling and reachable sticky actions.
- Bottom navigation keeps Resumen, Caja, Ventas and Inventario prominent; secondary modules remain under Más.

## Non-goals
No global purple gradients, decorative glow fields, gratuitous glassmorphism, infinite shimmer, arbitrary font changes, wholesale shadcn initialization, component overwrite, route changes or backend/business-logic edits as a side effect of visual work.
