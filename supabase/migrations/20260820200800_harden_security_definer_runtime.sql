-- Defense in depth for SECURITY DEFINER functions exposed through authenticated RPC.
-- We intentionally do NOT revoke authenticated EXECUTE here because these functions
-- are used by product flows. Instead:
--   1) remove PUBLIC/anon execution where the product does not need it;
--   2) pin the runtime search_path to trusted schemas plus pg_temp for the known
--      business mutation functions, preventing search_path hijacking.
--
-- This migration is idempotent and discovers overloaded signatures from pg_proc.

do $$
declare
  r record;
  fn text;
  targets constant text[] := array[
    'adjust_product_stock',
    'close_cash_register',
    'create_mobile_scanner_session',
    'create_product_from_scanner',
    'finalize_inventory_stocktake',
    'open_cash_register',
    'pair_mobile_scanner',
    'record_cash_register_movement',
    'revoke_mobile_scanner_session',
    'submit_mobile_scanner_event'
  ];
begin
  for r in
    select n.nspname as schema_name,
           p.proname,
           p.oid::regprocedure as signature
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef
       and p.proname = any(targets)
  loop
    fn := r.signature::text;
    execute format('alter function %s set search_path = pg_catalog, public, extensions, pg_temp', fn);
    execute format('revoke execute on function %s from public, anon', fn);
  end loop;
end $$;

-- Keep trigger-only SECURITY DEFINER functions unreachable through RPC.
revoke execute on function public.apply_sale_effects() from public, anon, authenticated;
revoke execute on function public.revert_sale_effects() from public, anon, authenticated;
revoke execute on function public.unapply_sale_on_cancel() from public, anon, authenticated;
revoke execute on function public.apply_purchase_effects() from public, anon, authenticated;
revoke execute on function public.revert_purchase_effects() from public, anon, authenticated;
