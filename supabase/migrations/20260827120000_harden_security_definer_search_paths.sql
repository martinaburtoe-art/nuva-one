BEGIN;

-- SECURITY DEFINER functions must not inherit a caller-controlled search path.
-- Keep fully-qualified application schemas while pinning pg_catalog first.
ALTER FUNCTION private.create_product_from_scanner(uuid, text, text, text, text, text, numeric, numeric, integer, integer)
  SET search_path = pg_catalog, public, private, extensions;

ALTER FUNCTION private.record_cash_register_movement(uuid, text, numeric, text)
  SET search_path = pg_catalog, public, private, extensions;

COMMIT;
