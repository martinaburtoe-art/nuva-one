begin;

select plan(12);

-- Scanner and stock/cash RPCs are SECURITY DEFINER only where the server-side
-- authorization boundary is enforced. Keep these invariants in CI so a future
-- grant change cannot silently reopen the tenant boundary.
select ok(
  (select p.prosecdef
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'pair_mobile_scanner'
      and pg_get_function_identity_arguments(p.oid) = 'p_pair_code text'),
  'pair_mobile_scanner remains SECURITY DEFINER'
);

select ok(
  not has_function_privilege('anon', 'public.pair_mobile_scanner(text)', 'EXECUTE'),
  'anon cannot execute pair_mobile_scanner'
);

select ok(
  has_function_privilege('authenticated', 'public.pair_mobile_scanner(text)', 'EXECUTE'),
  'authenticated can execute pair_mobile_scanner'
);

select ok(
  not has_function_privilege('anon', 'public.create_mobile_scanner_session(uuid)', 'EXECUTE'),
  'anon cannot execute create_mobile_scanner_session'
);

select ok(
  not has_function_privilege('anon', 'public.submit_mobile_scanner_event(uuid,text,uuid,text)', 'EXECUTE'),
  'anon cannot execute submit_mobile_scanner_event'
);

select ok(
  not has_function_privilege('anon', 'public.adjust_product_stock(uuid,integer,text,text,uuid)', 'EXECUTE'),
  'anon cannot execute adjust_product_stock'
);

select ok(
  not has_function_privilege('anon', 'public.open_cash_register(uuid,numeric)', 'EXECUTE'),
  'anon cannot execute open_cash_register'
);

select ok(
  not has_function_privilege('anon', 'public.close_cash_register(uuid,numeric)', 'EXECUTE'),
  'anon cannot execute close_cash_register'
);

select ok(
  not has_function_privilege('anon', 'public.finalize_inventory_stocktake(uuid)', 'EXECUTE'),
  'anon cannot execute finalize_inventory_stocktake'
);

select ok(
  exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public'
       and p.proname='pair_mobile_scanner'
       and pg_get_function_identity_arguments(p.oid)='p_pair_code text'
       and exists (
         select 1
           from unnest(coalesce(p.proconfig, '{}'::text[])) cfg
          where cfg like 'search_path=%'
       )
  ),
  'pair_mobile_scanner pins an explicit search_path'
);

select ok(
  (select c.relrowsecurity
     from pg_class c
     join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='product_codes'),
  'product_codes keeps row-level security enabled'
);

select ok(
  (select c.relrowsecurity
     from pg_class c
     join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='products'),
  'products keeps row-level security enabled'
);

select * from finish();
rollback;
