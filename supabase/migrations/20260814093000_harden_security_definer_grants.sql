-- SECURITY DEFINER grant audit (P1). Every SECURITY DEFINER function in the
-- project was checked for: SET search_path (mutable-search-path shadowing --
-- all already correct, see 7a7da8a) and EXECUTE grants (this migration).
-- Postgres grants EXECUTE on new functions to PUBLIC by default, so every
-- SECURITY DEFINER function needs an explicit REVOKE unless it's genuinely
-- meant to be called by authenticated/anon directly (e.g. get_business_members,
-- invite_team_member -- those already have correct REVOKE+GRANT pairs from
-- 20260731190000 and are NOT touched here).
--
-- Two real, exploitable gaps found and fixed below:
--
-- 1) increment_ai_usage(uuid, integer) -- defined in 20260709220000 with no
--    REVOKE at all. Right now an authenticated user could call it directly
--    with their own JWT (not service role), passing ANY business_id and ANY
--    p_daily_limit (e.g. 999999999), completely bypassing the app's
--    STARTER_DAILY_AI_LIMIT=30 check in /api/chat and /api/business/explain
--    and freely incrementing/resetting another tenant's usage counter.
--    pgTAP (020_privilege_hardening.sql) already asserts this should be
--    revoked -- the test was written ahead of the migration that makes it
--    pass.
--
-- 2) business_is_active(uuid) -- defined in 20260719000000, STABLE (not a
--    trigger), so it IS directly callable via RPC by anyone with EXECUTE.
--    It takes an arbitrary business_id with no membership check and returns
--    whether that business is on a paid plan or still inside its trial --
--    a small but real cross-tenant information leak (plan/trial status of
--    any business, guessable or enumerable by UUID).
--
-- The remaining functions below (apply_payment_to_sale, forum_sync_reply_count,
-- enforce_business_active, enforce_product_plan_limit) are RETURNS TRIGGER,
-- so Postgres already refuses to invoke them outside a trigger context
-- ("trigger functions can only be called as triggers") regardless of grants
-- -- REVOKE here is defense-in-depth / consistency with the pattern already
-- established in 20260622030000, not a fix for an exploitable path.

REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(uuid, integer)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.business_is_active(uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.apply_payment_to_sale()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.forum_sync_reply_count()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.enforce_business_active()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.enforce_product_plan_limit()
  FROM PUBLIC, anon, authenticated;
