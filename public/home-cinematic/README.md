# Nüva One — cinematic masters

This directory is the final media contract for the experimental `/experience` homepage.

## Required set

For each of the 14 scene IDs below, production requires three files:

`<scene>.mp4` · `<scene>-poster.webp` · `<scene>-last.webp`

Scene IDs: `hero`, `sales`, `customers`, `inventory`, `scanner`, `purchases`, `cash`, `shipping`, `finance`, `score`, `automation`, `studio`, `connections`, `final`.

## Master video specification

- 16:9 landscape.
- Target 1080p or higher.
- 4, 6 or 8 seconds are acceptable; 8 seconds is preferred for scroll scrubbing.
- No text, logo, UI, watermark or readable generated interface inside the footage.
- Natural motion with a slow camera move that remains clean when scrubbed frame-by-frame.
- Bright, premium, human, documentary/editorial visual language.
- Keep the same business world, owner, wardrobe, materials and daylight logic across scenes.

## Poster and last frame

The poster should be the first strong frame of the master. The last frame must be a clean export from the end of the same MP4, not a separately invented image. The repository verification gate requires all three files when a scene is present.

Recommended conversion after export:

```bash
ffmpeg -y -i scene.mp4 -frames:v 1 -vf scale=1600:-2 -q:v 5 scene-poster.webp
ffmpeg -y -sseof -0.15 -i scene.mp4 -frames:v 1 -vf scale=1600:-2 -q:v 5 scene-last.webp
```

## Google Flow handoff

Generate/export the 14 scenes using the prompts in `docs/HOME_EDITORIAL_EXPERIENCE_PROMPTS.md` and the scene order in `docs/home-cinematic-veo-manifest.json`. Prefer first-frame continuity where available. Use the previous scene's last frame as the next scene's starting reference when the generated composition needs to feel physically continuous.

The website owns typography and interface overlays. Do not ask the video generator to render the Nüva One wordmark, chapter labels, metrics or UI cards.

## Release gate

Do not release the cinematic media to the production homepage until all 14 sets pass the cinematic integrity and technical media checks and the actual `/experience` page has been visually checked in a desktop and mobile browser with the real media loaded.
