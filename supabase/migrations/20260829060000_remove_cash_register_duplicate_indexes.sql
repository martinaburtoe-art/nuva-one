-- Remove redundant access paths left by successive operational migrations.
-- Keep products_business_id_id_key because existing composite foreign keys depend on
-- that constraint as their referenced unique key. The later products_business_id_id_unique
-- constraint is the redundant copy and can be removed without rewriting those FKs.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_business_id_id_unique;

-- Keep the canonical cash-register indexes and remove only duplicate copies.
DROP INDEX IF EXISTS public.idx_cash_register_movements_register_date;
DROP INDEX IF EXISTS public.uq_cash_register_open_business;
