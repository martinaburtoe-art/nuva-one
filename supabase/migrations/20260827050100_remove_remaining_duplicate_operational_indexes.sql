-- Clean-rebuild invariant: remove duplicate access paths left by older
-- migrations. Preserve the canonical/constraint-backed index in each pair.
DROP INDEX IF EXISTS public.idx_cash_movements_business_created;
DROP INDEX IF EXISTS public.idx_cash_movements_register_created;
DROP INDEX IF EXISTS public.uq_cash_register_one_open_per_business;
DROP INDEX IF EXISTS public.products_business_id_id_unique;
DROP INDEX IF EXISTS public.idx_tax_f29_period_business;
DROP INDEX IF EXISTS public.idx_whatsapp_owner_links_business_id;
