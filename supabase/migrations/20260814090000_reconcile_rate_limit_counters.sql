-- Reconciliation: public.rate_limit_counters, public.check_rate_limit() and
-- public.cleanup_rate_limit_counters() already exist in the live database
-- (confirmed via the generated Supabase types and the pgTAP tests in
-- supabase/tests/database/020_privilege_hardening.sql and 030_rate_limit.sql,
-- both of which assume these objects exist) and are already called from
-- application code (src/lib/rate-limit.server.ts, used today by
-- /api/billing/subscribe/register, /api/billing/payments/create and the
-- WhatsApp webhook). What was missing was a migration file for them, so a
-- fresh environment created from supabase/migrations alone would not have
-- this table/functions at all. This migration is that missing history,
-- written idempotently (IF NOT EXISTS / CREATE OR REPLACE) so it is a no-op
-- against an environment where these objects already exist.
--
-- Generic fixed-window rate limiter: one row per bucket key, reset when the
-- window has elapsed. Deliberately simple (fixed window, not sliding/token
-- bucket) -- see src/lib/rate-limit.server.ts for the full rationale.
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  bucket_key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated/anon on purpose: RLS denies everything by
-- default. This table has no per-user meaning to expose -- only server code
-- using the service-role client (which bypasses RLS) ever touches it.
GRANT ALL ON public.rate_limit_counters TO service_role;

-- Atomic: locks the bucket's row (FOR UPDATE) before reading its count, so
-- concurrent requests for the same bucket_key can't race past p_max_requests
-- the way a naive "SELECT count then INSERT if under limit" would.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket_key text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  current_window timestamptz;
BEGIN
  INSERT INTO public.rate_limit_counters (bucket_key, count, window_start)
  VALUES (p_bucket_key, 0, now())
  ON CONFLICT (bucket_key) DO NOTHING;

  SELECT count, window_start INTO current_count, current_window
  FROM public.rate_limit_counters
  WHERE bucket_key = p_bucket_key
  FOR UPDATE;

  -- Window elapsed: reset to a fresh window starting now, this request is
  -- request 1 of the new window.
  IF now() - current_window >= make_interval(secs => p_window_seconds) THEN
    UPDATE public.rate_limit_counters
    SET count = 1, window_start = now()
    WHERE bucket_key = p_bucket_key;
    RETURN true;
  END IF;

  IF current_count >= p_max_requests THEN
    RETURN false;
  END IF;

  UPDATE public.rate_limit_counters
  SET count = count + 1
  WHERE bucket_key = p_bucket_key;

  RETURN true;
END;
$$;

-- Called only from server code (service role) via checkRateLimit() -- never
-- meant to be invoked directly by a client with its own JWT/anon key, since
-- the caller picks the bucket_key/max/window with no verification that they
-- match what the UI actually sent.
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;

-- Maintenance: drops counters whose window is stale (>1 day old) so the
-- table doesn't grow unbounded. Not wired to a schedule by this migration --
-- that's an infra-level cron concern -- but the function needs to exist and
-- be revoked from anon/authenticated the same as check_rate_limit.
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_counters()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_counters
  WHERE window_start < now() - interval '1 day';
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limit_counters()
  FROM PUBLIC, anon, authenticated;
