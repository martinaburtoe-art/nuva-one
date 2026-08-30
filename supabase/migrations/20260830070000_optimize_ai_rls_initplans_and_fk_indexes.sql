-- Performance hardening identified by the hosted Supabase advisors.
-- Preserve authorization semantics while forcing auth/member checks into
-- init-plan form and covering uncovered foreign keys.

DROP POLICY IF EXISTS "Members see members" ON public.business_members;
DROP POLICY IF EXISTS "Users see own membership" ON public.business_members;
CREATE POLICY "Members see members"
  ON public.business_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT private.is_business_member(business_id, (SELECT auth.uid())))
  );

DROP POLICY IF EXISTS "Members create own assets" ON public.ai_asset_library;
CREATE POLICY "Members create own assets"
  ON public.ai_asset_library
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (SELECT private.is_business_member(business_id, (SELECT auth.uid())))
  );

DROP POLICY IF EXISTS "Members view own assets" ON public.ai_asset_library;
CREATE POLICY "Members view own assets"
  ON public.ai_asset_library
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_business_member(business_id, (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Members create own generation jobs" ON public.ai_generation_jobs;
CREATE POLICY "Members create own generation jobs"
  ON public.ai_generation_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (SELECT private.is_business_member(business_id, (SELECT auth.uid())))
  );

DROP POLICY IF EXISTS "Members view own generation jobs" ON public.ai_generation_jobs;
CREATE POLICY "Members view own generation jobs"
  ON public.ai_generation_jobs
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_business_member(business_id, (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Members view studio daily usage" ON public.ai_tool_usage_daily;
CREATE POLICY "Members view studio daily usage"
  ON public.ai_tool_usage_daily
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_business_member(business_id, (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Members view studio monthly usage" ON public.ai_tool_usage_monthly;
CREATE POLICY "Members view studio monthly usage"
  ON public.ai_tool_usage_monthly
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_business_member(business_id, (SELECT auth.uid()))));

CREATE INDEX IF NOT EXISTS ai_asset_library_job_id_idx
  ON public.ai_asset_library (job_id);

CREATE INDEX IF NOT EXISTS ai_asset_library_user_id_idx
  ON public.ai_asset_library (user_id);

CREATE INDEX IF NOT EXISTS ai_generation_jobs_tool_id_idx
  ON public.ai_generation_jobs (tool_id);

CREATE INDEX IF NOT EXISTS ai_generation_jobs_user_id_idx
  ON public.ai_generation_jobs (user_id);

CREATE INDEX IF NOT EXISTS ai_tool_usage_daily_tool_id_idx
  ON public.ai_tool_usage_daily (tool_id);

CREATE INDEX IF NOT EXISTS ai_tool_usage_monthly_tool_id_idx
  ON public.ai_tool_usage_monthly (tool_id);
