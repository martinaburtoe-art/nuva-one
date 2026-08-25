-- Keep privileged operational functions out of the PostgREST-exposed public schema.
-- Public RPC names remain stable through SECURITY INVOKER wrappers; the actual
-- privileged implementations live in private and retain their tenant/role checks.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

ALTER FUNCTION public.adjust_product_stock(uuid, integer, text, text, uuid) SET SCHEMA private;
ALTER FUNCTION public.close_cash_register(uuid, numeric) SET SCHEMA private;
ALTER FUNCTION public.create_mobile_scanner_session(uuid) SET SCHEMA private;
ALTER FUNCTION public.create_product_from_scanner(uuid, text, text, text, text, text, numeric, numeric, integer, integer) SET SCHEMA private;
ALTER FUNCTION public.finalize_inventory_stocktake(uuid) SET SCHEMA private;
ALTER FUNCTION public.get_cash_register_summary(uuid) SET SCHEMA private;
ALTER FUNCTION public.open_cash_register(uuid, numeric) SET SCHEMA private;
ALTER FUNCTION public.pair_mobile_scanner(text) SET SCHEMA private;
ALTER FUNCTION public.record_cash_register_movement(uuid, text, numeric, text) SET SCHEMA private;
ALTER FUNCTION public.revoke_mobile_scanner_session(uuid) SET SCHEMA private;
ALTER FUNCTION public.submit_mobile_scanner_event(uuid, text, uuid, text) SET SCHEMA private;

CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  p_product_id uuid,
  p_delta integer,
  p_reason text DEFAULT 'Ajuste manual',
  p_source_type text DEFAULT 'manual_adjustment',
  p_source_id uuid DEFAULT NULL
)
RETURNS TABLE(product_id uuid, stock_before integer, stock_after integer)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$ SELECT * FROM private.adjust_product_stock($1, $2, $3, $4, $5); $$;

CREATE OR REPLACE FUNCTION public.close_cash_register(p_cash_register_id uuid, p_counted_cash numeric)
RETURNS public.cash_registers
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$ SELECT private.close_cash_register($1, $2); $$;

CREATE OR REPLACE FUNCTION public.create_mobile_scanner_session(p_business_id uuid)
RETURNS TABLE(session_id uuid, pair_code text, expires_at timestamptz)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$ SELECT * FROM private.create_mobile_scanner_session($1); $$;

CREATE OR REPLACE FUNCTION public.create_product_from_scanner(
  p_business_id uuid,
  p_name text,
  p_code text,
  p_code_type text DEFAULT 'barcode',
  p_sku text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_cost numeric DEFAULT 0,
  p_price numeric DEFAULT 0,
  p_initial_stock integer DEFAULT 0,
  p_low_stock_threshold integer DEFAULT 5
)
RETURNS TABLE(product_id uuid, sku text, code text, stock_before integer, stock_after integer)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$ SELECT * FROM private.create_product_from_scanner($1, $2, $3, $4, $5, $6, $7, $8, $9, $10); $$;

CREATE OR REPLACE FUNCTION public.finalize_inventory_stocktake(p_stocktake_id uuid)
RETURNS TABLE(stocktake_id uuid, status text, adjusted_products integer, total_adjustment numeric)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$ SELECT * FROM private.finalize_inventory_stocktake($1); $$;

CREATE OR REPLACE FUNCTION public.get_cash_register_summary(p_cash_register_id uuid)
RETURNS TABLE(
  cash_register_id uuid,
  business_id uuid,
  status text,
  opening_amount numeric,
  cash_sales numeric,
  cash_income numeric,
  cash_withdrawals numeric,
  cash_refunds numeric,
  expected_cash numeric,
  counted_cash numeric,
  difference numeric,
  movement_count bigint,
  opened_at timestamptz,
  closed_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$ SELECT * FROM private.get_cash_register_summary($1); $$;

CREATE OR REPLACE FUNCTION public.open_cash_register(p_business_id uuid, p_opening_amount numeric)
RETURNS public.cash_registers
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$ SELECT private.open_cash_register($1, $2); $$;

CREATE OR REPLACE FUNCTION public.pair_mobile_scanner(p_pair_code text)
RETURNS TABLE(session_id uuid, business_id uuid, expires_at timestamptz)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$ SELECT * FROM private.pair_mobile_scanner($1); $$;

CREATE OR REPLACE FUNCTION public.record_cash_register_movement(
  p_cash_register_id uuid,
  p_movement_type text,
  p_amount numeric,
  p_reason text
)
RETURNS public.cash_register_movements
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$ SELECT private.record_cash_register_movement($1, $2, $3, $4); $$;

CREATE OR REPLACE FUNCTION public.revoke_mobile_scanner_session(p_session_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$ SELECT private.revoke_mobile_scanner_session($1); $$;

CREATE OR REPLACE FUNCTION public.submit_mobile_scanner_event(
  p_session_id uuid,
  p_code text,
  p_client_event_id uuid,
  p_input_type text DEFAULT 'camera'
)
RETURNS public.mobile_scanner_events
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, extensions
AS $$ SELECT private.submit_mobile_scanner_event($1, $2, $3, $4); $$;

REVOKE ALL ON FUNCTION private.adjust_product_stock(uuid, integer, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.close_cash_register(uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.create_mobile_scanner_session(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.create_product_from_scanner(uuid, text, text, text, text, text, numeric, numeric, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.finalize_inventory_stocktake(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.get_cash_register_summary(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.open_cash_register(uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.pair_mobile_scanner(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.record_cash_register_movement(uuid, text, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.revoke_mobile_scanner_session(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.submit_mobile_scanner_event(uuid, text, uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.adjust_product_stock(uuid, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.close_cash_register(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION private.create_mobile_scanner_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.create_product_from_scanner(uuid, text, text, text, text, text, numeric, numeric, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.finalize_inventory_stocktake(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_cash_register_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.open_cash_register(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION private.pair_mobile_scanner(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.record_cash_register_movement(uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.revoke_mobile_scanner_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.submit_mobile_scanner_event(uuid, text, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.adjust_product_stock(uuid, integer, text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.close_cash_register(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_mobile_scanner_session(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_product_from_scanner(uuid, text, text, text, text, text, numeric, numeric, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finalize_inventory_stocktake(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_cash_register_summary(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.open_cash_register(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pair_mobile_scanner(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_cash_register_movement(uuid, text, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_mobile_scanner_session(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_mobile_scanner_event(uuid, text, uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.adjust_product_stock(uuid, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_cash_register(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_mobile_scanner_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_from_scanner(uuid, text, text, text, text, text, numeric, numeric, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_inventory_stocktake(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cash_register_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_cash_register(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pair_mobile_scanner(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_cash_register_movement(uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_mobile_scanner_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_mobile_scanner_event(uuid, text, uuid, text) TO authenticated;

COMMIT;
