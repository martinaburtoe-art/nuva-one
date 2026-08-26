begin;

-- These SECURITY DEFINER wrappers perform their own auth/business-role checks.
-- They must be callable by an authenticated session, while remaining closed to anon.
revoke all on function public.claim_pending_invitations() from public, anon, authenticated;
grant execute on function public.claim_pending_invitations() to authenticated;

revoke all on function public.get_business_members(uuid) from public, anon, authenticated;
grant execute on function public.get_business_members(uuid) to authenticated;

commit;
