-- These functions are trigger-only implementation details, not public RPC endpoints.
-- Keep SECURITY DEFINER for the database-side business operation, but remove
-- default PUBLIC execution so anon/authenticated clients cannot invoke them directly.

REVOKE EXECUTE ON FUNCTION public.sync_sale_effects() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_purchase_effects() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_sale_effect_transaction() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_purchase_effect_transaction() FROM PUBLIC;
