-- Keep one canonical time index for platform telemetry. Older migrations used
-- idx_platform_events_created; production may already have the newer canonical
-- name, so both branches are handled idempotently.
DROP INDEX IF EXISTS public.idx_platform_events_created;
CREATE INDEX IF NOT EXISTS platform_events_occurred_at_idx
  ON public.platform_events (created_at DESC);
