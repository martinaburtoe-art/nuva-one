-- Nüva Studio runtime tables are intentionally protected by RLS policies.
-- Restore the table privileges required by the authenticated Studio API.
-- Policies already constrain rows to business members / owning user; these grants
-- only make the intended policy-controlled operations callable through PostgREST.

GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_generation_jobs TO authenticated;
GRANT SELECT, INSERT ON TABLE public.ai_asset_library TO authenticated;

DROP POLICY IF EXISTS "Members update own generation jobs" ON public.ai_generation_jobs;
CREATE POLICY "Members update own generation jobs"
  ON public.ai_generation_jobs FOR UPDATE TO authenticated
  USING (
    private.is_business_member(business_id, auth.uid())
  )
  WITH CHECK (
    private.is_business_member(business_id, auth.uid())
    AND user_id = auth.uid()
  );
