-- Keep privileged operational functions out of the PostgREST-exposed public schema.
-- Public RPC names remain stable through SECURITY INVOKER wrappers; the actual
-- privileged implementations live in private and retain their tenant/role checks.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Clean-rebuild-safe cash register implementations. The historical migration
-- chain did not consistently define the open/close RPCs before this hardening
-- migration, so define the implementations before creating their wrappers.
CREATE OR REPLACE FUNCTION private.open_cash_register(
  p_business_id uuid,
  p_opening_amount numeric
)
RETURNS public.cash_registers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $function$
DECLARE
  v_row public.cash_registers;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado' USING errcode = '42501';
  END IF;
  IF NOT private.has_business_role(p_business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]) THEN
    RAISE EXCEPTION 'No autorizado' USING errcode = '42501';
  END IF;
  IF p_opening_amount IS NULL OR p_opening_amount < 0 THEN
    RAISE EXCEPTION 'Monto inicial inválido' USING errcode = '22003';
  END IF;
  INSERT INTO public.cash_registers (business_id, opened_by, opening_amount, opened_at, status)
  VALUES (p_business_id, auth.uid(), p_opening_amount, now(), 'open')
  RETURNING * INTO v_row;
  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya existe una caja abierta para este negocio' USING errcode = '23505';
END;
$function$;

CREATE OR REPLACE FUNCTION private.close_cash_register(
  p_cash_register_id uuid,
  p_counted_cash numeric
)
RETURNS public.cash_registers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $function$
DECLARE
  v_business_id uuid;
  v_status text;
  v_row public.cash_registers;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado' USING errcode = '42501'; END IF;
  SELECT cr.business_id, cr.status INTO v_business_id, v_status FROM public.cash_registers cr WHERE cr.id = p_cash_register_id FOR UPDATE;
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Caja no encontrada' USING errcode = 'P0002'; END IF;
  IF NOT private.has_business_role(v_business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]) THEN RAISE EXCEPTION 'No autorizado' USING errcode = '42501'; END IF;
  IF p_counted_cash IS NULL OR p_counted_cash < 0 THEN RAISE EXCEPTION 'Monto contado inválido' USING errcode = '22003'; END IF;
  IF v_status <> 'open' THEN RAISE EXCEPTION 'La caja ya está cerrada' USING errcode = 'P0001'; END IF;
  UPDATE public.cash_registers SET status = 'closed', counted_cash = p_counted_cash, closed_at = now(), closed_by = auth.uid() WHERE id = p_cash_register_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$function$;

-- This function existed in the production migration lineage but was missing
-- from the repository's clean-rebuild lineage. Recreate the same tenant-safe
-- implementation before moving it to private below.
CREATE OR REPLACE FUNCTION public.record_cash_register_movement(
  p_cash_register_id uuid,
  p_movement_type text,
  p_amount numeric,
  p_reason text
)
RETURNS public.cash_register_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_reg public.cash_registers;
  v_row public.cash_register_movements;
  v_expected numeric;
  v_direction text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_reg FROM public.cash_registers WHERE id = p_cash_register_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CASH_REGISTER_NOT_FOUND'; END IF;
  IF NOT private.has_business_role(v_reg.business_id, v_user, ARRAY['owner'::public.member_role,'admin'::public.member_role,'staff'::public.member_role]) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_reg.status <> 'open' THEN RAISE EXCEPTION 'CASH_REGISTER_CLOSED'; END IF;
  IF p_movement_type NOT IN ('deposit','withdrawal') OR p_amount IS NULL OR p_amount <= 0 OR COALESCE(trim(p_reason),'') = '' THEN RAISE EXCEPTION 'INVALID_CASH_MOVEMENT'; END IF;
  SELECT v_reg.opening_amount + COALESCE(sum(CASE WHEN movement_type='deposit' THEN amount ELSE -amount END),0) INTO v_expected FROM public.cash_register_movements WHERE cash_register_id = p_cash_register_id;
  IF p_movement_type='withdrawal' AND p_amount > v_expected THEN RAISE EXCEPTION 'INSUFFICIENT_EXPECTED_CASH'; END IF;
  INSERT INTO public.cash_register_movements (business_id,cash_register_id,created_by,movement_type,amount,reason)
  VALUES (v_reg.business_id,p_cash_register_id,v_user,p_movement_type,p_amount,trim(p_reason)) RETURNING * INTO v_row;
  v_direction := CASE WHEN p_movement_type='deposit' THEN 'inflow' ELSE 'outflow' END;
  INSERT INTO public.financial_cash_ledger (business_id,entry_date,direction,amount,category,description,payment_method,source_type,source_id)
  VALUES (v_reg.business_id,current_date,v_direction,p_amount,'cash_register_adjustment',trim(p_reason),'efectivo','cash_register_movement',v_row.id)
  ON CONFLICT (business_id,source_type,source_id) DO NOTHING;
  RETURN v_row;
END;
$function$;

ALTER FUNCTION public.adjust_product_stock(uuid, integer, text, text, uuid) SET SCHEMA private;
ALTER FUNCTION public.create_mobile_scanner_session(uuid) SET SCHEMA private;
ALTER FUNCTION public.create_product_from_scanner(uuid, text, text, text, text, text, numeric, numeric, integer, integer) SET SCHEMA private;
ALTER FUNCTION public.finalize_inventory_stocktake(uuid) SET SCHEMA private;
ALTER FUNCTION public.get_cash_register_summary(uuid) SET SCHEMA private;
-- open_cash_register is created directly in private above because the clean
-- migration chain may not contain a public definition to ALTER.
ALTER FUNCTION public.pair_mobile_scanner(text) SET SCHEMA private;
ALTER FUNCTION public.record_cash_register_movement(uuid, text, numeric, text) SET SCHEMA private;
ALTER FUNCTION public.revoke_mobile_scanner_session(uuid) SET SCHEMA private;
ALTER FUNCTION public.submit_mobile_scanner_event(uuid, text, uuid, text) SET SCHEMA private;

CREATE OR REPLACE FUNCTION public.adjust_product_stock(p_product_id uuid,p_delta integer,p_reason text DEFAULT 'Ajuste manual',p_source_type text DEFAULT 'manual_adjustment',p_source_id uuid DEFAULT NULL)
RETURNS TABLE(product_id uuid, stock_before integer, stock_after integer)
LANGUAGE sql SECURITY INVOKER SET search_path = public, private, extensions
AS $$ SELECT * FROM private.adjust_product_stock($1, $2, $3, $4, $5); $$;

CREATE OR REPLACE FUNCTION public.close_cash_register(p_cash_register_id uuid, p_counted_cash numeric)
RETURNS public.cash_registers LANGUAGE sql SECURITY INVOKER SET search_path = public, private, extensions
AS $$ SELECT private.close_cash_register($1, $2); $$;

CREATE OR REPLACE FUNCTION public.create_mobile_scanner_session(p_business_id uuid)
RETURNS TABLE(session_id uuid, pair_code text, expires_at timestamptz) LANGUAGE sql SECURITY INVOKER SET search_path = public, private, extensions
AS $$ SELECT * FROM private.create_mobile_scanner_session($1); $$;

CREATE OR REPLACE FUNCTION public.create_product_from_scanner(p_business_id uuid,p_name text,p_code text,p_code_type text DEFAULT 'barcode',p_sku text DEFAULT NULL,p_category text DEFAULT NULL,p_cost numeric DEFAULT 0,p_price numeric DEFAULT 0,p_initial_stock integer DEFAULT 0,p_low_stock_threshold integer DEFAULT 5)
RETURNS TABLE(product_id uuid, sku text, code text, stock_before integer, stock_after integer) LANGUAGE sql SECURITY INVOKER SET search_path = public, private, extensions
AS $$ SELECT * FROM private.create_product_from_scanner($1, $2, $3, $4, $5, $6, $7, $8, $9, $10); $$;

CREATE OR REPLACE FUNCTION public.finalize_inventory_stocktake(p_stocktake_id uuid)
RETURNS TABLE(stocktake_id uuid, status text, adjusted_products integer, total_adjustment numeric) LANGUAGE sql SECURITY INVOKER SET search_path = public, private, extensions
AS $$ SELECT * FROM private.finalize_inventory_stocktake($1); $$;

CREATE OR REPLACE FUNCTION public.get_cash_register_summary(p_cash_register_id uuid)
RETURNS TABLE(cash_register_id uuid,business_id uuid,status text,opening_amount numeric,cash_sales numeric,cash_income numeric,cash_withdrawals numeric,cash_refunds numeric,expected_cash numeric,counted_cash numeric,difference numeric,movement_count bigint,opened_at timestamptz,closed_at timestamptz)
LANGUAGE sql SECURITY INVOKER SET search_path = public, private, extensions
AS $$ SELECT * FROM private.get_cash_register_summary($1); $$;

CREATE OR REPLACE FUNCTION public.open_cash_register(p_business_id uuid, p_opening_amount numeric)
RETURNS public.cash_registers LANGUAGE sql SECURITY INVOKER SET search_path = public, private, extensions
AS $$ SELECT private.open_cash_register($1, $2); $$;

CREATE OR REPLACE FUNCTION public.pair_mobile_scanner(p_pair_code text)
RETURNS TABLE(session_id uuid, business_id uuid, expires_at timestamptz) LANGUAGE sql SECURITY INVOKER SET search_path = public, private, extensions
AS $$ SELECT * FROM private.pair_mobile_scanner($1); $$;

CREATE OR REPLACE FUNCTION public.record_cash_register_movement(p_cash_register_id uuid,p_movement_type text,p_amount numeric,p_reason text)
RETURNS public.cash_register_movements LANGUAGE sql SECURITY INVOKER SET search_path = public, private, extensions
AS $$ SELECT private.record_cash_register_movement($1, $2, $3, $4); $$;

CREATE OR REPLACE FUNCTION public.revoke_mobile_scanner_session(p_session_id uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public, private, extensions
AS $$ SELECT private.revoke_mobile_scanner_session($1); $$;

CREATE OR REPLACE FUNCTION public.submit_mobile_scanner_event(p_session_id uuid,p_code text,p_client_event_id uuid,p_input_type text DEFAULT 'camera')
RETURNS public.mobile_scanner_events LANGUAGE sql SECURITY INVOKER SET search_path = public, private, extensions
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
GRANT EXECUTE ON FUNCTION private.pair_mobile_scanner(uuid) TO authenticated;
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
