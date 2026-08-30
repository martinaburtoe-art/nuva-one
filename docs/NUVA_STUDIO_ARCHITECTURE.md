# Nüva Studio — Architecture

Nüva Studio is the provider-agnostic creation and growth layer of Nüva One.

## Principles

1. The business experience is Nüva; external providers are implementation details.
2. Provider credentials remain server-side environment variables and are never stored in the database.
3. Every generation is tenant-bound to `business_id` and `user_id`.
4. Expensive capabilities use quotas/fair-use rather than promising unlimited external API usage.
5. Provider fallback is handled by the existing AI Gateway.
6. Generated outputs are represented as jobs/assets so media providers can be added without redesigning the UI.

## Layers

- `src/lib/ai-gateway.server.ts`: provider routing, failover, circuit breaking and cost metadata.
- `src/lib/ai-gateway/tool-registry.ts`: canonical capability/tool catalog.
- `src/lib/nuva-studio.server.ts`: business-aware orchestration and prompts.
- `src/routes/api/studio.ts`: authenticated, tenant-scoped Studio endpoint.
- `src/routes/_authenticated/studio.tsx`: customer-facing Studio workspace.
- `supabase/migrations/20260829010000_nuva_studio_foundation.sql`: registry, jobs and asset-library persistence.

## Capabilities

`chat`, `research`, `marketing`, `copywriting`, `image`, `image_edit`, `video`, `voice`, `brand`, `strategy`, `document`, `automation`.

The first vertical slice intentionally completes the text orchestration path while exposing the contracts required for image, video and voice adapters. Media adapters should be added behind the same registry rather than coupled to the UI.

## Production configuration

Required AI credentials depend on the active provider order already supported by the existing gateway:

- `AI_PROVIDER`
- `AI_FALLBACK_PROVIDERS`
- `GROQ_API_KEY` / `GROQ_MODEL`
- `LOVABLE_API_KEY` / `LOVABLE_MODEL`
- `OPENAI_API_KEY` / `OPENAI_MODEL`

Future media providers must follow the same rule: server-side secret only, explicit capability registration, quota accounting, retry policy and audit metadata.
