# Quality Gate — overflow real vs. intentional horizontal scrolling

## Purpose

Nüva One must reject unintended page-level horizontal overflow without disabling intentional horizontal interaction inside bounded components.

## Required invariant

At every supported viewport, the page itself must not expose horizontal overflow beyond the viewport. The canonical page-level check is `documentElement.scrollWidth <= viewportWidth` after the application is hydrated and settled, with a diagnostic that identifies the first overflowing node.

## Intentional horizontal rails

A component such as the `product-preview` module rail may intentionally use `overflow-x: auto`/`scroll` and content wider than its visible box. That internal scroll width is not, by itself, a page overflow defect.

The browser gate therefore distinguishes:

- **Real page overflow:** content escapes its intended layout/containment boundary and increases the page's horizontal extent.
- **Contained overflow:** content is wider than its local box but is contained by an ancestor using horizontal `hidden`, `clip`, `auto`, or `scroll` overflow. This is allowed when the component explicitly requires horizontal scrolling.

## Fix policy

1. Reproduce the failure at the exact failing viewport.
2. Identify the node responsible for the excess width and its layout ancestors.
3. Fix the smallest responsible layout boundary (`min-width: 0`, width/max-width constraints, or an explicit local overflow boundary as appropriate).
4. Preserve intentional horizontal rails.
5. Never use a global `body { overflow-x: hidden; }` or equivalent page-wide suppression to make the test pass.
6. Validate at 320, 390, 768, and 1024 px and run the complete browser gate.

## Evidence standard

A green browser gate requires evidence from the current commit/PR SHA. A rerun that checks an obsolete PR merge ref does not validate newer source or test changes and must not be recorded as a PASS.
