# Nüva One — Flow/Veo production prompts

## Purpose

Production kit for replacing the current photographic fallback with final cinematic masters. The supplied reference video is used only for interaction language: full-screen editorial photography, large typography, deliberate scroll-driven progression, restrained UI inserts and smooth reframing. Do not reproduce its brand, images, text, website or interface.

## Continuity lock

Use these references/ingredients in every generation where available:

- Same Chilean small-business location: compact contemporary neighborhood retail shop, pale wood, warm white plaster, soft concrete, large front window, natural morning light.
- Same owner: Chilean small-business owner, early 30s, neutral contemporary clothing, understated appearance, natural skin texture, consistent hair and wardrobe.
- Same customer: recurring customer, consistent appearance and wardrobe.
- Same visual grade: bright, airy, premium editorial photography, natural daylight, restrained contrast, subtle film grain, warm whites, pale wood, muted business colors.
- Nüva celeste appears only as a subtle accent in practical UI or light reflections.
- No baked-in text, logos, UI, watermarks or generated typography.
- No cyberpunk, neon, holograms, floating dashboards, CGI/3D-render appearance or generic stock montage.
- Camera language: slow dolly, lateral drift, rack focus, macro push, controlled pull-back. Avoid abrupt cuts.

## Recommended Flow strategy

Generate a canonical still first, then animate it. Use ingredients/references for the owner, customer, shop and key objects. Use first+last frames when a transition needs to land on an exact composition. Keep masters at 4–8 seconds and assemble longer sequences in Scene Builder. Current Flow documentation confirms Veo 3.1 supports text-to-video, first-frame and first+last-frame workflows at 4/6/8 seconds; ingredients/references are supported for 8-second clips in Veo 3.1 Lite/Fast. Gemini Omni Flash supports 4/6/8/10-second clips and broader editing workflows. Verify current model/cost in Flow before generation.

## 01 — HERO / EL NEGOCIO REAL

**Still prompt**

Photorealistic editorial photograph of a real Chilean neighborhood retail business opening in the early morning. Same small contemporary shop used throughout the entire sequence: pale oak counter, warm white plaster, soft concrete floor, front window with gentle daylight, carefully arranged everyday products, believable lived-in details. No people posing for camera. Calm, premium, human, cinematic composition with generous negative space on the left for typography. Natural lens falloff, realistic materials, subtle film grain, high-end editorial photography, no text, no logo, no watermark.

**Motion**

Very slow forward dolly toward the entrance as morning light gradually fills the space. No object morphing. No sudden movement. End on a composition that can transition naturally into the owner at the counter.

## 02 — VENTAS

Owner at the same counter, same wardrobe and location, serving a customer during a normal sale. Frame hands and interaction more than faces. Product passes from owner to customer. Bright natural window light. Leave clean negative space for editorial typography. Photorealistic, restrained, documentary luxury.

Motion: slow lateral camera drift toward the hands and payment moment.

## 03 — CLIENTES

Same customer returns to the same store. Owner recognizes the customer naturally. Warm human interaction without posing. Use shallow depth of field and a gentle rack focus from product to customer to owner. Same wardrobe and location. No visible brand text.

Motion: slow rack focus followed by a subtle push-in.

## 04 — INVENTARIO

Move into the same store's backroom/storage area. Real shelves with imperfect but believable stock: boxes, products, labels without readable text, a little disorder but not a warehouse. Owner searches for one product. Bright side light from the shop. Editorial realism.

Motion: slow handheld documentary move deeper into storage, controlled and stable.

## 05 — SCANNER

Macro close-up of the owner's hand holding a real retail product and barcode scanner/phone near the barcode. Same shop and lighting. Focus on physical action and product texture. No generated UI or readable text.

Motion: macro push toward barcode, subtle scan gesture, then rack focus to the product.

## 06 — COMPRAS

Same storage area. A shelf has a visible gap where a product is running low. Owner notices the gap and checks the product context on a phone/laptop off to the side. Keep the physical scene primary. No floating interface.

Motion: camera starts on the empty shelf space and gently reframes toward the owner's decision.

## 07 — CAJA

Return to the same front counter. A customer completes a payment. The action is clear but understated: card/contactless terminal, receipt, product handoff. Natural light and believable retail environment.

Motion: short controlled push toward the payment moment, then settle.

## 08 — DESPACHOS

A carefully packed order leaves the same shop. Owner places a package on the counter and hands it toward a courier/door. Same materials and lighting. Package is plain, no logo or text.

Motion: controlled tracking movement following the package from counter toward the exit.

## 09 — FINANZAS

Same owner later in the same shop, now calmer, reviewing the day's business on a laptop at the same counter. Golden natural light, quieter composition, reflective but optimistic. Laptop screen should be clean and abstract with no readable generated text.

Motion: very slow orbit/reframe around owner, revealing the store context around them.

## 10 — NÜVA SCORE

Same business and owner, but the composition becomes calmer and wider. The shop feels more ordered and intentional than in the opening. Keep physical reality primary. Leave a clean area for an editorial Nüva Score data insert added by the website.

Motion: slow pull-back revealing the full business context.

## 11 — AUTOMATIZACIONES

Owner continues a normal task while a small operational event resolves in the background: a notification on a phone or laptop, owner notices it briefly and continues working. The point is that the business keeps moving rather than stopping for administration. No floating holograms.

Motion: subtle time compression in background activity while the camera remains controlled and natural.

## 12 — NÜVA STUDIO / IA

Over-the-shoulder view of the same owner asking a question on a laptop in the same shop. Screen is intentionally soft/abstract with no generated text; the website will provide the actual UI. The owner looks focused, then relaxed as they receive an answer.

Motion: slow over-shoulder push toward the laptop, shallow depth of field.

## 13 — CONEXIONES

Wide editorial composition of the same business environment showing the owner, phone, laptop, payment terminal and packaged order as ordinary physical objects within one coherent workspace. Nothing floats. The sense of connection comes from composition and continuity, not visual effects.

Motion: controlled pull-back that reveals the whole operational ecosystem in one frame.

## 14 — FINAL

Return to the exact visual world of scene 01: same shop, same camera family, same owner/location cues. The space now feels subtly more ordered and calm. Morning/soft daylight. Leave generous negative space for final Nüva One CTA. This must feel like returning to the beginning after the business has changed.

Motion: slow pull-back and hold. Final frame should be clean and stable for the CTA.

## Export checklist

For each scene export:

- `scene-id-poster.webp`
- `scene-id.mp4`
- 4–8 seconds unless a longer assembled sequence is necessary
- no baked-in typography
- no logo/watermark
- clean first frame
- clean last frame when used as a transition anchor
- consistent owner, customer, shop, wardrobe and lighting
- check 16:9 desktop crop and 9:16/mobile crop
- optimize final web assets before committing

## Website integration

Replace the current fallback by adding assets under:

```text
public/home-cinematic/
```

Then populate the existing `poster` and `video` slots in `SCENES`. Do not redesign the scene engine. Do not change backend, auth, Supabase, billing or internal modules for media integration.

## Final acceptance gate

The Homepage is production-complete only when the final masters are present, the deployed experience has been visually reviewed on desktop and 390px mobile, reduced motion has been checked, horizontal overflow is zero, console/runtime errors are zero, all chapter anchors land on their intended scene, and the final CTA/routes remain functional.
