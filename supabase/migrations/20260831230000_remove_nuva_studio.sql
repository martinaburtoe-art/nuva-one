-- Remove Nüva Studio without disturbing the shared Nüva Agent registry.
-- Historical Studio migrations remain immutable; this migration cleans their runtime objects.

DELETE FROM public.ai_tool_registry
WHERE id LIKE 'studio.%';

DROP TABLE IF EXISTS public.ai_asset_library CASCADE;
DROP TABLE IF EXISTS public.ai_generation_jobs CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'nuva-studio-assets'
  ) THEN
    DELETE FROM storage.objects WHERE bucket_id = 'nuva-studio-assets';
    DELETE FROM storage.buckets WHERE id = 'nuva-studio-assets';
  END IF;
END $$;
