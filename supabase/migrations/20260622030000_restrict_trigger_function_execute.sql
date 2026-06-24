-- Fix: apply_sale_effects, revert_sale_effects, unapply_sale_on_cancel,
-- apply_purchase_effects, and revert_purchase_effects are SECURITY DEFINER
-- functions, but they are only ever meant to be invoked internally by
-- Postgres triggers (BEFORE INSERT/UPDATE/DELETE on sales/purchases) -- the
-- client never calls them directly. By default Postgres grants EXECUTE on
-- new functions to PUBLIC, which the security scanner flags because it
-- means anon/authenticated could call them directly via RPC, bypassing the
-- trigger context they were designed for.
--
-- Revoking direct EXECUTE does not break the triggers: trigger functions
-- are invoked by the database engine itself, not via a role's EXECUTE
-- privilege check the way a direct SQL/RPC call would be.
--
-- is_business_member / has_business_role are intentionally NOT touched here
-- -- those ARE called directly (from RLS policies evaluated as the calling
-- role), so authenticated must keep EXECUTE on them.

REVOKE EXECUTE ON FUNCTION public.apply_sale_effects() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revert_sale_effects() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unapply_sale_on_cancel() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_purchase_effects() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revert_purchase_effects() FROM PUBLIC, anon, authenticated;
