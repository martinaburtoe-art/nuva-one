-- Harden SECURITY DEFINER RPC exposure.
-- These internal accounting/security-sensitive functions are not intended to be
-- callable directly through PostgREST by anon/authenticated clients.
revoke execute on function public.post_financial_journal(uuid,date,text,text,uuid,jsonb) from anon, authenticated;
revoke execute on function public.post_purchase_payment_accounting(uuid) from anon, authenticated;
revoke execute on function public.post_sale_payment_accounting(uuid) from anon, authenticated;
revoke execute on function public.track_platform_event(text,uuid,text,text,text,jsonb) from anon, authenticated;
revoke execute on function public.get_business_members(uuid) from anon, authenticated;
revoke execute on function public.invite_team_member(uuid,text,public.member_role,text,jsonb) from anon, authenticated;
revoke execute on function public.claim_pending_invitations() from anon, authenticated;
