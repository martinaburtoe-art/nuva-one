-- Remove redundant access paths left by successive operational migrations.
-- The products (business_id,id) uniqueness is fully implied by the primary
-- key on id, so its redundant unique constraint/index can be removed safely.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_business_id_id_key;
DROP INDEX IF EXISTS public.products_business_id_id_unique;

-- Keep the canonical cash-register indexes and remove only duplicate copies.
DROP INDEX IF EXISTS public.idx_cash_register_movements_register_date;
DROP INDEX IF EXISTS public.uq_cash_register_open_business;
