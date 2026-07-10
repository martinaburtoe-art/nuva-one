-- Daily AI message counter per business, used to enforce the Starter plan's
-- usage cap (Pro is unlimited). Incremented atomically via
-- increment_ai_usage() so concurrent requests can't race past the limit.
CREATE TABLE public.ai_usage_daily (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT current_date,
  message_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, usage_date)
);

ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own ai usage" ON public.ai_usage_daily
  FOR SELECT USING (private.is_business_member(business_id, auth.uid()));

-- Called only from the server (service role) via /api/chat -- never exposed
-- directly to the client. Returns false once the daily cap is reached,
-- without incrementing further, so the caller can show an upgrade prompt.
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_business_id uuid, p_daily_limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  INSERT INTO public.ai_usage_daily (business_id, usage_date, message_count)
  VALUES (p_business_id, current_date, 0)
  ON CONFLICT (business_id, usage_date) DO NOTHING;

  SELECT message_count INTO current_count
  FROM public.ai_usage_daily
  WHERE business_id = p_business_id AND usage_date = current_date
  FOR UPDATE;

  IF current_count >= p_daily_limit THEN
    RETURN false;
  END IF;

  UPDATE public.ai_usage_daily
  SET message_count = message_count + 1
  WHERE business_id = p_business_id AND usage_date = current_date;

  RETURN true;
END;
$$;
