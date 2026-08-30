-- A user must be able to resolve the business memberships that belong to their own JWT.
-- This does not expose other members: the predicate is restricted to auth.uid().
-- The existing member/admin policy remains responsible for broader membership visibility.
DROP POLICY IF EXISTS "Users see own membership" ON public.business_members;
CREATE POLICY "Users see own membership"
  ON public.business_members
  FOR SELECT
  USING (user_id = auth.uid());
