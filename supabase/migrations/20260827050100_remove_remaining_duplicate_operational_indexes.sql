-- Clean-rebuild invariant: remove duplicate access paths left by older
-- migrations. Preserve canonical/constraint-backed indexes in each pair.
DO $$
DECLARE
  index_name text;
BEGIN
  FOREACH index_name IN ARRAY ARRAY[
    'idx_cash_movements_business_created',
    'idx_cash_movements_register_created',
    'uq_cash_register_one_open_per_business',
    'products_business_id_id_unique',
    'idx_tax_f29_period_business',
    'idx_whatsapp_owner_links_business_id'
  ] LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = index_name
        AND c.relkind = 'i'
        AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint con
          WHERE con.conindid = c.oid
        )
    ) THEN
      EXECUTE format('DROP INDEX IF EXISTS public.%I', index_name);
    END IF;
  END LOOP;
END
$$;
