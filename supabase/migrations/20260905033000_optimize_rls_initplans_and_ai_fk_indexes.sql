-- Performance hardening identified by Supabase advisors.
-- Preserve authorization semantics while forcing auth/member checks into
-- init-plan form and covering AI/Studio foreign-key access paths.
-- Replay-safe for clean CI rebuilds where optional AI tables may be absent.

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

DO $$
BEGIN
  IF to_regclass('public.ai_asset_library') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Members create own assets" ON public.ai_asset_library';
    EXECUTE 'CREATE POLICY "Members create own assets" ON public.ai_asset_library FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT private.is_business_member(business_id, (SELECT auth.uid()))))';
    EXECUTE 'DROP POLICY IF EXISTS "Members view own assets" ON public.ai_asset_library';
    EXECUTE 'CREATE POLICY "Members view own assets" ON public.ai_asset_library FOR SELECT TO authenticated USING ((SELECT private.is_business_member(business_id, (SELECT auth.uid()))))';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ai_asset_library_job_id_idx ON public.ai_asset_library (job_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ai_asset_library_user_id_idx ON public.ai_asset_library (user_id)';
  END IF;

  IF to_regclass('public.ai_generation_jobs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Members create own generation jobs" ON public.ai_generation_jobs';
    EXECUTE 'CREATE POLICY "Members create own generation jobs" ON public.ai_generation_jobs FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT private.is_business_member(business_id, (SELECT auth.uid()))))';
    EXECUTE 'DROP POLICY IF EXISTS "Members view own generation jobs" ON public.ai_generation_jobs';
    EXECUTE 'CREATE POLICY "Members view own generation jobs" ON public.ai_generation_jobs FOR SELECT TO authenticated USING ((SELECT private.is_business_member(business_id, (SELECT auth.uid()))))';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ai_generation_jobs_tool_id_idx ON public.ai_generation_jobs (tool_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ai_generation_jobs_user_id_idx ON public.ai_generation_jobs (user_id)';
  END IF;

  IF to_regclass('public.ai_tool_usage_daily') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Members view studio daily usage" ON public.ai_tool_usage_daily';
    EXECUTE 'CREATE POLICY "Members view studio daily usage" ON public.ai_tool_usage_daily FOR SELECT TO authenticated USING ((SELECT private.is_business_member(business_id, (SELECT auth.uid()))))';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ai_tool_usage_daily_tool_id_idx ON public.ai_tool_usage_daily (tool_id)';
  END IF;

  IF to_regclass('public.ai_tool_usage_monthly') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Members view studio monthly usage" ON public.ai_tool_usage_monthly';
    EXECUTE 'CREATE POLICY "Members view studio monthly usage" ON public.ai_tool_usage_monthly FOR SELECT TO authenticated USING ((SELECT private.is_business_member(business_id, (SELECT auth.uid()))))';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ai_tool_usage_monthly_tool_id_idx ON public.ai_tool_usage_monthly (tool_id)';
  END IF;
END
$$;