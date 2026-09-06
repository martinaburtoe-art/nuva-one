# Nüva One — Homepage Cinematic Media Manifest

## Reference analysis

The supplied reference video is treated as a **language reference**, not as reusable content. The target craft is:

- full-viewport visual field;
- editorial typography over the visual rather than a conventional SaaS hero;
- scroll as the timeline/controller;
- slow camera movement and deliberate reframing rather than arbitrary scene cuts;
- continuity of one real business/world across the story;
- UI appears only when it explains an action;
- light, premium, photographic direction for Nüva One rather than copying the reference's brand, imagery, or interface.

## Production rule

The homepage code already accepts optional `poster` and `video` values per scene. Until final media is generated, the experience uses its own CSS art direction as a deterministic fallback. Final Flow/Veo masters should replace the fallback without changing the scene logic.

## Scene-to-media map

| # | Scene | Master visual | Suggested motion | Required UI insert |
|---|---|---|---|---|
| 01 | HERO | Exterior/interior of a real Chilean SME opening in morning light | very slow push-in | none |
| 02 | VENTAS | owner at counter, customer interaction | lateral drift toward hands | small sale confirmation |
| 03 | CLIENTES | same customer returns / owner recognizes them | gentle rack focus | customer context |
| 04 | INVENTARIO | same store backroom, imperfect stock/shelves | slow handheld move into storage | stock attention |
| 05 | SCANNER | close-up product/barcode in hand | macro push + scan gesture | SKU/stock card |
| 06 | COMPRAS | shelf gap / replenishment decision | move from empty space to owner | reorder recommendation |
| 07 | CAJA | payment/cash moment at counter | short push toward transaction | synchronized sale |
| 08 | DESPACHOS | package leaves the store | tracking move with package | dispatch state |
| 09 | FINANZAS | owner reviewing the day in natural light | slow orbit/reframe | one meaningful metric |
| 10 | NÜVA SCORE | same business, calmer wider composition | pull-back revealing context | Score 86 |
| 11 | AUTOMATIZACIONES | owner continues work while workflow resolves | subtle time compression | signal → action |
| 12 | NÜVA STUDIO | owner asks a question on laptop | over-shoulder push | one AI answer |
| 13 | CONEXIONES | business + phone + payment + laptop in same world | controlled pull-back | connection hints, not holograms |
| 14 | FINAL | return to opening composition, now more ordered | slow pull-back / hold | final CTA |

## Continuity bible

Use one recurring business, one recurring owner, one coherent location, and a restrained palette: warm whites, pale wood, soft concrete, natural skin tones, muted business colors, Nüva celeste only as a subtle accent.

Avoid: cyberpunk, neon, holograms, giant floating dashboards, CGI/3D-render appearance, generic stock-photo montage, arbitrary location changes, and text baked into generated media.

## Flow generation strategy

Google Flow currently supports Veo 3.1 Lite/Fast/Quality with 4/6/8 second clips, first-frame and first+last-frame workflows, and reference/ingredient workflows where supported. For continuity, prefer a generated master frame first, then animate that frame; use first+last frames for transitions that must land on a precise composition. Keep the same character/location references across the project.

Recommended workflow:

1. Generate the canonical business/location frame.
2. Generate owner/customer reference frames with matching wardrobe and lighting.
3. Generate the 8–12 second visual masters as short clips.
4. Save clean first frames for transitions.
5. Trim/export production masters as web-optimized MP4/WebM where appropriate.
6. Place media under `public/home-cinematic/` using the scene IDs.
7. Wire the scene `poster` and `video` slots; do not alter scene logic.
8. Validate desktop, 390px mobile, reduced motion, no horizontal overflow, and no console errors.

## File convention

```text
public/home-cinematic/
  hero-poster.webp
  hero.mp4
  sales-poster.webp
  sales.mp4
  customers-poster.webp
  customers.mp4
  inventory-poster.webp
  inventory.mp4
  scanner-poster.webp
  scanner.mp4
  purchases-poster.webp
  purchases.mp4
  cash-poster.webp
  cash.mp4
  shipping-poster.webp
  shipping.mp4
  finance-poster.webp
  finance.mp4
  score-poster.webp
  score.mp4
  automation-poster.webp
  automation.mp4
  studio-poster.webp
  studio.mp4
  connections-poster.webp
  connections.mp4
  final-poster.webp
  final.mp4
```

## Acceptance gate

Do not call the homepage production-complete until the generated masters are present and visually reviewed in the deployed experience. Green CI/build alone is not sufficient for the final media gate.
