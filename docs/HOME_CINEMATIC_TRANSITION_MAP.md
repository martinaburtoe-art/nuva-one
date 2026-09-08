# Nüva One — Cinematic transition map

This is the production contract between Flow/Veo and the scroll compositor. The goal is continuity, not a collection of unrelated clips.

## Global continuity lock

- Same Chilean neighborhood retail business across all scenes.
- Same owner, customer, wardrobe family, materials and natural-light language.
- Bright, airy, premium editorial photography; human and documentary rather than glossy CGI.
- No generated text, logos, UI, watermarks, holograms or floating dashboards inside the video masters.
- Each clip should have a clean first frame and, when it is a transition anchor, a deliberate final frame.
- The website supplies typography, product/UI inserts, progress, CTA and data overlays.

## Transition contracts

| From | To | Visual bridge | Flow technique |
|---|---|---|---|
| 01 Hero | 02 Ventas | Entrance/room movement settles at counter | First + last frame |
| 02 Ventas | 03 Clientes | Product/payment handoff leads into returning customer | First + last frame + ingredients |
| 03 Clientes | 04 Inventario | Camera follows owner away from counter into storage | First + last frame |
| 04 Inventario | 05 Scanner | Hand/product remains the visual anchor; macro push | First + last frame + ingredient product |
| 05 Scanner | 06 Compras | Barcode/product context resolves into low-stock shelf | First + last frame |
| 06 Compras | 07 Caja | Owner moves from stock decision back toward counter | First + last frame |
| 07 Caja | 08 Despachos | Package/product handoff continues toward exit | First + last frame |
| 08 Despachos | 09 Finanzas | Exit/forward movement resolves into calmer return to counter | First + last frame |
| 09 Finanzas | 10 Nüva Score | Camera pulls back to reveal full business context | First + last frame |
| 10 Nüva Score | 11 Automatizaciones | Operational activity continues while owner stays in flow | Ingredients + controlled motion |
| 11 Automatizaciones | 12 Nüva Studio / IA | Notification/device becomes the reason for the next action | First + last frame + device ingredient |
| 12 Nüva Studio / IA | 13 Conexiones | Camera pulls back from laptop into whole workspace | First + last frame |
| 13 Conexiones | 14 Final | Wide workspace resolves back to opening shop composition | First + last frame |

## Scroll compositor

The web layer keeps one active scene and prepares the next scene underneath a restrained cross-dissolve. The active clip is scrubbed by scene progress; the incoming clip begins at its clean first frame. This makes the experience reversible: scrolling down advances the story, scrolling up reverses it without timers or autoplay state.

The compositor is intentionally limited to `transform`, `opacity`, `filter` and clipping/containment so the cinematic motion remains compositor-friendly. Reduced-motion removes the depth/filter treatment and leaves the content readable.

## Asset naming contract

```text
public/home-cinematic/
  01-hero-poster.webp
  01-hero.mp4
  02-sales-poster.webp
  02-sales.mp4
  ...
  14-final-poster.webp
  14-final.mp4
```

Do not commit generated Flow masters until they pass the continuity and crop checklist.

## Flow generation order

1. Generate canonical stills for the owner, customer, shop and recurring objects.
2. Generate scene 01 and lock its final frame.
3. Use that final frame as scene 02's first frame; add the same owner/shop references.
4. Repeat through scene 14, saving deliberate transition frames as reusable project assets.
5. Prefer Veo 3.1 Lite/Fast when ingredients/references are required; use first+last frames for exact transition landings.
6. Use Scene Builder to inspect the assembled sequence before export.
7. Export poster + MP4 pairs and place them in `public/home-cinematic/`.

Google's current Flow documentation confirms first+last-frame generation for Veo 3.1 at 4/6/8 seconds, ingredients/references for 8-second Veo 3.1 Lite/Fast clips, and Scene Builder for arranging and trimming multiple clips.
