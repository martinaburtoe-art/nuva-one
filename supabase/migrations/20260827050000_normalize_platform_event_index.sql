-- Normalize the platform telemetry time index across the two schema shapes
-- that have existed in the deployed database. The repository's clean rebuild
-- uses created_at; an older deployed shape used occurred_at.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'platform_events' AND column_name = 'created_at'
  ) THEN
    DROP INDEX IF EXISTS public.platform_events_occurred_at_idx;
    DROP INDEX IF EXISTS public.idx_platform_events_created;
    CREATE INDEX IF NOT EXISTS idx_platform_events_created
      ON public.platform_events (created_at DESC);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'platform_events' AND column_name = 'occurred_at'
  ) THEN
    DROP INDEX IF EXISTS public.idx_platform_events_created;
    CREATE INDEX IF NOT EXISTS platform_events_occurred_at_idx
      ON public.platform_events (occurred_at DESC);
  END IF;
END $$;
