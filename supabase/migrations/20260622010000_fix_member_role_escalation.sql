-- Fix: the previous "Owner/admin manage members" policy used FOR ALL with a
-- WITH CHECK that included `OR user_id = auth.uid()`. Because FOR ALL applies
-- that WITH CHECK to UPDATE as well as INSERT, any member (including staff or
-- viewer) could update their OWN business_members row -- including its `role`
-- column -- and self-promote to 'owner' or 'admin'.
--
-- Fix: split the single FOR ALL policy into per-action policies. Only
-- owner/admin can INSERT, UPDATE, or DELETE members. A user may still leave a
-- business themselves (DELETE own row), but may never change their own role.

DROP POLICY IF EXISTS "Owner/admin manage members" ON public.business_members;

-- Owner/admin can add new members
CREATE POLICY "Owner/admin insert members" ON public.business_members
  FOR INSERT
  WITH CHECK (public.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));

-- Owner/admin can change roles of OTHER members (never via self-service)
CREATE POLICY "Owner/admin update members" ON public.business_members
  FOR UPDATE
  USING (public.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]))
  WITH CHECK (public.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));

-- Owner/admin can remove any member; any member can remove themselves (leave)
CREATE POLICY "Owner/admin or self delete members" ON public.business_members
  FOR DELETE
  USING (
    public.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::public.member_role[])
    OR user_id = auth.uid()
  );
