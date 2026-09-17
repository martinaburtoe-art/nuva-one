# Nüva One — Reference video profile

## Source
Uploaded reference video analyzed for the cinematic homepage direction.

- Duration: 26.57 s
- 30 fps
- 576×1024 vertical capture
- Editorial architecture/interiorism reference

## Translation to Nüva One
The reference is used as a **visual language reference**, not as content to copy.

Core behavior:
- scroll-driven camera feeling;
- long cinematic reveals;
- changes of scale from environment → detail → environment;
- restrained typography over imagery;
- continuity between scenes;
- transitions based on visual rhythm rather than SaaS card stacking;
- human/business context before product UI;
- return to the complete environment at the end.

## Nüva One implementation contract
The 14 chapters remain the product story:
Hero → Sales → Customers → Inventory → Scan → Purchases → Cash → Shipping → Finance → Score → Automation → Studio → Connections → Final.

Each chapter may contain a real MP4 master. When present, the MP4 is scrubbed by chapter progress (`currentTime = progress × duration`) rather than autoplayed. Missing media must use the visual fallback without breaking layout.

## Character / location continuity
Reference character:
- adult woman;
- short dark wavy hair;
- genuine natural smile;
- neutral linen apron;
- olive/neutral clothing;
- natural movement and realistic human behavior.

Reference business:
- warm natural-light specialty/grocery shop;
- wood framing and shelving;
- neutral natural materials;
- realistic product density;
- calm premium atmosphere.

These references establish continuity for generated Nüva scenes. They should not be copied as a literal advertisement or imply the reference business is Nüva One.
