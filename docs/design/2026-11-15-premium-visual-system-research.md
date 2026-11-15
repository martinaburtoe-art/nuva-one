# Nüva One — premium visual system and product UI research

Date: 2026-11-15  
Scope: visual quality, responsive interaction design, photography and information hierarchy. No business logic, database, permissions, billing or RLS changes.

## Reference products and transferable decisions

- **Linear** — quiet navigation chrome, strong typography, keyboard-first interaction and progressive disclosure. Apply to fast operational workflows and dense lists.
- **Stripe** — calm financial surfaces, precise tables, tabular numerals, layered detail and high trust. Apply to finance, payments, billing and reports.
- **Vercel** — disciplined status hierarchy, compact technical data and meaningful monochrome contrast. Apply to system health, integrations and administration.
- **Attio** — contextual CRM summaries, relationship timelines and AI embedded in the workflow. Apply to customer intelligence and follow-up.
- **Shopify** — commerce-oriented task hierarchy and operational summaries. Apply to POS, sales and inventory.
- **Notion** — approachable empty states, clear onboarding and content-first surfaces. Apply to first-run experiences and help.

Sources:
- 925 Studios, “35 SaaS Dashboard Design Examples, Trends and Patterns (2026)”: https://www.925studios.co/blog/saas-dashboard-design-examples-2026
- AdminLTE, “10 Best SaaS Dashboard Design Examples & Trends (2026)”: https://adminlte.io/blog/saas-dashboard-design-examples/
- SaaS UI, “7 SaaS UI Design Trends for 2026”: https://www.saasui.design/blog/7-saas-ui-design-trends-2026
- SaaS UI, real dashboard screen library: https://www.saasui.design/best-saas-dashboard-ui-inspiration
- AYDesign, “Best practices for SaaS dashboard design in 2026”: https://www.aydesign.ai/blog/saas-dashboard-design-best-practices-2026

## Design decisions

1. Keep one recognizable Nüva design language: typography, spacing scale, control geometry, navigation and motion.
2. Keep module-specific personalities: POS lime, Sales coral, CRM rose, Quotes amber, Inventory cyan, Finance violet, People orange, Analytics teal, Intelligence purple.
3. Improve perceived depth with layered surfaces, controlled shadows, subtle gradients and clear hover/focus/pressed states. Avoid repeating identical card grids.
4. Lead each workspace with one useful task or metric, then progressively disclose secondary data. Avoid repeating KPIs across dashboard sections.
5. Use charts only when they answer a question; pair totals with period context, comparisons and drill-down actions.
6. Use photos for editorial context (onboarding, industry landing pages, help/education) and real user-uploaded images for products, customers and employees. Never use stock photos as fake customer/product/employee records.
7. Empty, loading, error and success states are designed product surfaces, not generic placeholders.
8. Mobile layouts prioritize the primary task, comfortable touch targets and no horizontal overflow.

## Photography policy

- The onboarding image is an editorial welcome image, not a representation of the user's business or data.
- Industry imagery should be selected by confirmed industry profile and be optional/lazy-loaded below the fold.
- Product photos, employee portraits, customer logos and business documents must come from user-provided content or explicitly licensed sources; no synthetic business records.
- The current Unsplash URL is a temporary editorial asset reference. Before production, download and optimize a licensed image as local WebP/AVIF, with responsive sizing and descriptive alt text.

## Implemented in this change

- Redesigned onboarding as a responsive split-screen experience with a full-bleed editorial photo panel, layered indigo/cyan overlays, branded value proposition and module cues.
- Added shared visual craft rules for typography, table hierarchy, form focus, button micro-interactions, scrollbar treatment, surface depth and reduced-motion behavior.
- Scoped shared polish under the authenticated Nüva app; no schema or workflow behavior changed.

## Required review before production

- Replace the temporary remote onboarding photo with an optimized local asset and confirm licensing/attribution.
- Capture authenticated screenshots at 320, 360, 390, 430, tablet and desktop widths.
- Review keyboard focus, contrast, empty/error/loading states, forms, dense tables, POS and financial charts.
- Review real module data density and remove duplicated summaries before promotion.
