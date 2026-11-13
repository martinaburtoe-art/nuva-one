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
The public `@noxen.studio` profile and selected Reels were reviewed through vidIQ on 2026-11-13. Their interaction patterns are documented in the reference study below; this is an adaptation of selected patterns, not a claim of pixel-perfect replication.


## Reference study: Instagram Reels de @noxen.studio

Consultados con vidIQ el 13-11-2026. Los videos se usan como referencias de interacción y narrativa, no como especificación para copiar literalmente.

- [Reel: creación de botón y workflow](https://www.instagram.com/reel/DSUtRtSiFAj/): comandos contextuales filtrados al escribir, configuración con preview, submenús y feedback de finalización. Aplicación: filtros contextuales con respuesta inmediata y feedback de éxito reservado a operaciones realmente completadas.
- [Reel: Notion AI](https://www.instagram.com/reel/DSC1VZqiRcG/): presentación humana, subtítulos legibles en cápsulas, marca persistente y cierre minimalista. Aplicación: microcopy de estado claro, badges compactos y jerarquía legible; no fijar elementos que compitan con navegación o contenido.
- [Reel: selección múltiple](https://www.instagram.com/reel/DR4fwnADodI/): UI aparece como overlay breve, contador de selección y barra contextual. Aplicación: estados de selección anunciados y acciones contextuales solo en listas donde existan operaciones por lote seguras y explícitas.

### Decisiones de producto para Nüva One

1. Priorizar velocidad y contexto: mostrar el control relevante junto a la acción que lo invoca, sin reemplazar innecesariamente toda la pantalla.
2. En Android, los filtros y calendarios usan superficies compactas, límites de altura, scroll contenido y áreas táctiles cómodas.
3. Los rangos rápidos de Resumen son inclusivos y se calculan con la fecha local del dispositivo: 7 días, 30 días, mes actual y mes anterior.
4. Los contadores de selección deben ser accesibles (aria-live) y las acciones destructivas nunca deben aparecer junto a acciones frecuentes sin confirmación explícita.
5. Reservar celebraciones visuales para hitos u operaciones completadas; no animar valores financieros ni crear confeti para la actualización ordinaria de KPIs.
6. Toda animación nueva debe respetar prefers-reduced-motion y mantener el contenido utilizable sin movimiento.
