-- Nüva Studio quota engine: atomic tenant-scoped reservations for daily/monthly fair-use.

CREATE TABLE IF NOT EXISTS public.ai_tool_usage_daily (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tool_id text NOT NULL REFERENCES public.ai_tool_registry(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT current_date,
  units_used integer NOT NULL DEFAULT 0 CHECK (units_used >= 0),
  generation_count integer NOT NULL DEFAULT 0 CHECK (generation_count >= 0),
  PRIMARY KEY (business_id, tool_id, usage_date)
);

CREATE TABLE IF NOT EXISTS public.ai_tool_usage_monthly (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tool_id text NOT NULL REFERENCES public.ai_tool_registry(id) ON DELETE CASCADE,
  usage_month date NOT NULL,
  units_used integer NOT NULL DEFAULT 0 CHECK (units_used >= 0),
  generation_count integer NOT NULL DEFAULT 0 CHECK (generation_count >= 0),
  PRIMARY KEY (business_id, tool_id, usage_month)
);

ALTER TABLE public.ai_tool_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_usage_monthly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view studio daily usage" ON public.ai_tool_usage_daily;
CREATE POLICY "Members view studio daily usage"
  ON public.ai_tool_usage_daily FOR SELECT TO authenticated
  USING (private.is_business_member(business_id, auth.uid()));

DROP POLICY IF EXISTS "Members view studio monthly usage" ON public.ai_tool_usage_monthly;
CREATE POLICY "Members view studio monthly usage"
  ON public.ai_tool_usage_monthly FOR SELECT TO authenticated
  USING (private.is_business_member(business_id, auth.uid()));

CREATE OR REPLACE FUNCTION private.reserve_ai_tool_quota(
  p_business_id uuid,
  p_tool_id text,
  p_units integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_tool public.ai_tool_registry%ROWTYPE;
  v_plan text;
  v_daily_units integer;
  v_monthly_units integer;
  v_daily_generations integer;
  v_monthly_generations integer;
  v_today date := current_date;
  v_month date := date_trunc('month', current_date)::date;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_units IS NULL OR p_units <= 0 THEN RAISE EXCEPTION 'invalid_units'; END IF;
  IF NOT private.is_business_member(p_business_id, auth.uid()) THEN RAISE EXCEPTION 'not_business_member'; END IF;

  SELECT * INTO v_tool FROM public.ai_tool_registry WHERE id = p_tool_id AND enabled = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'tool_unavailable'; END IF;

  SELECT lower(coalesce(plan, 'free')) INTO v_plan FROM public.businesses WHERE id = p_business_id;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'business_not_found'; END IF;
  IF NOT (v_plan = ANY(v_tool.plans)) THEN RAISE EXCEPTION 'plan_not_allowed'; END IF;

  INSERT INTO public.ai_tool_usage_daily (business_id, tool_id, usage_date, units_used, generation_count)
  VALUES (p_business_id, p_tool_id, v_today, p_units, 1)
  ON CONFLICT (business_id, tool_id, usage_date)
  DO UPDATE SET units_used = public.ai_tool_usage_daily.units_used + EXCLUDED.units_used,
                generation_count = public.ai_tool_usage_daily.generation_count + 1;

  INSERT INTO public.ai_tool_usage_monthly (business_id, tool_id, usage_month, units_used, generation_count)
  VALUES (p_business_id, p_tool_id, v_month, p_units, 1)
  ON CONFLICT (business_id, tool_id, usage_month)
  DO UPDATE SET units_used = public.ai_tool_usage_monthly.units_used + EXCLUDED.units_used,
                generation_count = public.ai_tool_usage_monthly.generation_count + 1;

  SELECT units_used, generation_count INTO v_daily_units, v_daily_generations
  FROM public.ai_tool_usage_daily WHERE business_id = p_business_id AND tool_id = p_tool_id AND usage_date = v_today;
  SELECT units_used, generation_count INTO v_monthly_units, v_monthly_generations
  FROM public.ai_tool_usage_monthly WHERE business_id = p_business_id AND tool_id = p_tool_id AND usage_month = v_month;

  IF v_tool.daily_limit IS NOT NULL AND v_daily_generations > v_tool.daily_limit THEN RAISE EXCEPTION 'daily_limit'; END IF;
  IF v_tool.monthly_limit IS NOT NULL AND v_monthly_generations > v_tool.monthly_limit THEN RAISE EXCEPTION 'monthly_limit'; END IF;

  RETURN jsonb_build_object('allowed', true, 'tool_id', p_tool_id, 'units_charged', p_units,
    'daily_used', v_daily_generations, 'daily_limit', v_tool.daily_limit,
    'monthly_used', v_monthly_generations, 'monthly_limit', v_tool.monthly_limit);
END;
$$;

CREATE OR REPLACE FUNCTION private.release_ai_tool_quota(
  p_business_id uuid,
  p_tool_id text,
  p_units integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_today date := current_date;
  v_month date := date_trunc('month', current_date)::date;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_business_member(p_business_id, auth.uid()) THEN RAISE EXCEPTION 'not_business_member'; END IF;
  UPDATE public.ai_tool_usage_daily SET units_used = GREATEST(0, units_used - p_units), generation_count = GREATEST(0, generation_count - 1)
  WHERE business_id = p_business_id AND tool_id = p_tool_id AND usage_date = v_today;
  UPDATE public.ai_tool_usage_monthly SET units_used = GREATEST(0, units_used - p_units), generation_count = GREATEST(0, generation_count - 1)
  WHERE business_id = p_business_id AND tool_id = p_tool_id AND usage_month = v_month;
END;
$$;

REVOKE ALL ON FUNCTION private.reserve_ai_tool_quota(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.release_ai_tool_quota(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.reserve_ai_tool_quota(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.release_ai_tool_quota(uuid, text, integer) TO authenticated;
