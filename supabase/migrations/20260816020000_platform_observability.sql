-- Nüva Platform Command Center: first-party application telemetry.
-- This table stores aggregate-safe operational events, not sensitive payloads.
CREATE TABLE IF NOT EXISTS public.platform_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL CHECK (char_length(event_name) BETWEEN 1 AND 100),
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view','session','auth','ai','error','performance','business')),
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  route TEXT,
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  status_code INTEGER CHECK (status_code IS NULL OR status_code BETWEEN 100 AND 599),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_events_created ON public.platform_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_events_type_created ON public.platform_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_events_business_created ON public.platform_events (business_id, created_at DESC);

ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

-- Platform telemetry is intentionally not exposed to normal tenant users.
REVOKE ALL ON public.platform_events FROM anon, authenticated;
GRANT SELECT, INSERT ON public.platform_events TO service_role;

CREATE OR REPLACE FUNCTION public.platform_metrics(p_from TIMESTAMPTZ DEFAULT now() - interval '24 hours', p_to TIMESTAMPTZ DEFAULT now())
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'events', (SELECT count(*) FROM public.platform_events WHERE created_at >= p_from AND created_at < p_to),
    'active_users', (SELECT count(DISTINCT user_id) FROM public.platform_events WHERE user_id IS NOT NULL AND created_at >= p_from AND created_at < p_to),
    'active_businesses', (SELECT count(DISTINCT business_id) FROM public.platform_events WHERE business_id IS NOT NULL AND created_at >= p_from AND created_at < p_to),
    'errors', (SELECT count(*) FROM public.platform_events WHERE event_type = 'error' AND created_at >= p_from AND created_at < p_to),
    'ai_events', (SELECT count(*) FROM public.platform_events WHERE event_type = 'ai' AND created_at >= p_from AND created_at < p_to),
    'avg_duration_ms', (SELECT round(avg(duration_ms)::numeric, 2) FROM public.platform_events WHERE duration_ms IS NOT NULL AND created_at >= p_from AND created_at < p_to)
  );
$$;

REVOKE ALL ON FUNCTION public.platform_metrics(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_metrics(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
