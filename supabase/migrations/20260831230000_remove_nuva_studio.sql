-- Remove Nüva Studio runtime objects while preserving the shared Nüva Agent registry.
-- Historical Studio migrations remain immutable; this migration cleans their runtime objects.

DELETE FROM public.ai_tool_registry
WHERE id LIKE 'studio.%';

DROP TABLE IF EXISTS public.ai_asset_library CASCADE;
DROP TABLE IF EXISTS public.ai_generation_jobs CASCADE;
