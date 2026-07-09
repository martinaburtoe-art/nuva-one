DROP POLICY IF EXISTS "Members insert audit_log" ON public.audit_log;
CREATE POLICY "Members insert audit_log" ON public.audit_log
  FOR INSERT
  WITH CHECK (
    private.is_business_member(business_id, auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );