UPDATE public.ai_tool_registry
SET plans = CASE
  WHEN 'pro' = ANY(plans) THEN ARRAY['starter','pro']::text[]
  ELSE ARRAY['starter']::text[]
END,
updated_at = now();
