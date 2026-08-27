-- Harden SECURITY DEFINER RPC exposure after finance functions exist.
-- Guards keep clean rebuilds resilient when an optional/legacy RPC is absent.
DO $$
DECLARE f regprocedure;
BEGIN
  f := to_regprocedure('public.post_financial_journal(uuid,date,text,text,uuid,jsonb)');
  IF f IS NOT NULL THEN EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', f); END IF;
  f := to_regprocedure('public.post_purchase_payment_accounting(uuid)');
  IF f IS NOT NULL THEN EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', f); END IF;
  f := to_regprocedure('public.post_sale_payment_accounting(uuid)');
  IF f IS NOT NULL THEN EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', f); END IF;
  f := to_regprocedure('public.track_platform_event(text,uuid,text,text,text,jsonb)');
  IF f IS NOT NULL THEN EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', f); END IF;
  f := to_regprocedure('public.get_business_members(uuid)');
  IF f IS NOT NULL THEN EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', f); END IF;
  f := to_regprocedure('public.invite_team_member(uuid,text,public.member_role,text,jsonb)');
  IF f IS NOT NULL THEN EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', f); END IF;
  f := to_regprocedure('public.claim_pending_invitations()');
  IF f IS NOT NULL THEN EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', f); END IF;
END $$;
