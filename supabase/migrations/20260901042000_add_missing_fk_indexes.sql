-- Cover foreign keys identified by the Supabase performance advisor.
-- These indexes improve parent-key updates/deletes and common child lookups.

CREATE INDEX IF NOT EXISTS ai_tool_usage_daily_tool_id_idx
  ON public.ai_tool_usage_daily (tool_id);

CREATE INDEX IF NOT EXISTS ai_tool_usage_monthly_tool_id_idx
  ON public.ai_tool_usage_monthly (tool_id);

CREATE INDEX IF NOT EXISTS nuva_studio_campaigns_user_id_idx
  ON public.nuva_studio_campaigns (user_id);
