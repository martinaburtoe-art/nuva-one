-- RLS policies call these SECURITY DEFINER helpers while evaluating authenticated requests.
-- Keep the helpers in the private schema and expose only function execution; the schema
-- itself is not part of the PostgREST API surface. Both helpers are read-only predicates.
GRANT EXECUTE ON FUNCTION private.is_business_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_business_role(UUID, UUID, public.member_role[]) TO authenticated;

-- A user must always be able to resolve their own membership without depending on
-- the broader membership policy (which itself calls the helper above).
DROP POLICY IF EXISTS "Users see own membership" ON public.business_members;
CREATE POLICY "Users see own membership"
  ON public.business_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
