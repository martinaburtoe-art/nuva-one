-- Keep RLS authorization semantics unchanged while making auth.uid() an init-plan
-- expression and consolidating the two permissive SELECT policies on business_members.

ALTER POLICY "Members create own assets" ON public.ai_asset_library
  WITH CHECK (
    user_id = (select auth.uid())
    AND private.is_business_member(business_id, (select auth.uid()))
  );

ALTER POLICY "Members view own assets" ON public.ai_asset_library
  USING (private.is_business_member(business_id, (select auth.uid())));

ALTER POLICY "Members create own generation jobs" ON public.ai_generation_jobs
  WITH CHECK (
    user_id = (select auth.uid())
    AND private.is_business_member(business_id, (select auth.uid()))
  );

ALTER POLICY "Members view own generation jobs" ON public.ai_generation_jobs
  USING (private.is_business_member(business_id, (select auth.uid())));

ALTER POLICY "Members view studio daily usage" ON public.ai_tool_usage_daily
  USING (private.is_business_member(business_id, (select auth.uid())));

ALTER POLICY "Members view studio monthly usage" ON public.ai_tool_usage_monthly
  USING (private.is_business_member(business_id, (select auth.uid())));

-- Preserve the original SELECT semantics:
-- members can see all members of businesses they belong to, and every user
-- can see their own membership row. These conditions are OR-equivalent to
-- the previous two permissive policies, but use one policy instead of two.
DROP POLICY IF EXISTS "Users see own membership" ON public.business_members;
ALTER POLICY "Members see members" ON public.business_members
  USING (
    private.is_business_member(business_id, (select auth.uid()))
    OR user_id = (select auth.uid())
  );
