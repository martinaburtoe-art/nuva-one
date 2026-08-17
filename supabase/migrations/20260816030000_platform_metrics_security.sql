-- Platform metrics are for platform administrators only.
-- The initial implementation uses the existing authenticated user identity;
-- the explicit platform-admin claim is expected to be supplied by the app's
-- platform authorization layer before the route is exposed in production.
CREATE OR REPLACE FUNCTION public.platform_metrics(
  p_from TIMESTAMPTZ DEFAULT now() - interval '24 hours',
  p_to TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_from >= p_to THEN
    RAISE EXCEPTION 'Invalid metrics interval';
  END IF;

  SELECT jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'events', (SELECT count(*) FROM public.platform_events WHERE created_at >= p_from AND created_at < p_to),
    'active_users', (SELECT count(DISTINCT user_id) FROM public.platform_events WHERE user_id IS NOT NULL AND created_at >= p_from AND created_at < p_to),
    'active_businesses', (SELECT count(DISTINCT business_id) FROM public.platform_events WHERE business_id IS NOT NULL AND created_at >= p_from AND created_at < p_to),
    'page_views', (SELECT count(*) FROM public.platform_events WHERE event_type = 'page_view' AND created_at >= p_from AND created_at < p_to),
    'errors', (SELECT count(*) FROM public.platform_events WHERE event_type = 'error' AND created_at >= p_from AND created_at < p_to),
    'ai_events', (SELECT count(*) FROM public.platform_events WHERE event_type = 'ai' AND created_at >= p_from AND created_at < p_to),
    'avg_duration_ms', (SELECT round(avg(duration_ms)::numeric, 2) FROM public.platform_events WHERE duration_ms IS NOT NULL AND created_at >= p_from AND created_at < p_to),
    'p95_duration_ms', (SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) FROM public.platform_events WHERE duration_ms IS NOT NULL AND created_at >= p_from AND created_at < p_to),
    'p99_duration_ms', (SELECT percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms) FROM public.platform_events WHERE duration_ms IS NOT NULL AND created_at >= p_from AND created_at < p_to)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_metrics(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_metrics(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
