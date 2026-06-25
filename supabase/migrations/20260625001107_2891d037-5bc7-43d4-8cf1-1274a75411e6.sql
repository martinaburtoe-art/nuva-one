REVOKE EXECUTE ON FUNCTION public.apply_sale_effects() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revert_sale_effects() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unapply_sale_on_cancel() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_purchase_effects() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revert_purchase_effects() FROM PUBLIC, anon, authenticated;