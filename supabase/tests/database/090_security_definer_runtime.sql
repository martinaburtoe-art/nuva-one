begin;

select plan(7);

-- Trigger-only functions must not be callable by application roles.
select has_function_privilege('authenticated', 'public.apply_sale_effects()', 'EXECUTE') is false as ok,
       'authenticated cannot execute apply_sale_effects directly' as description;
select has_function_privilege('authenticated', 'public.revert_sale_effects()', 'EXECUTE') is false as ok,
       'authenticated cannot execute revert_sale_effects directly' as description;
select has_function_privilege('authenticated', 'public.apply_purchase_effects()', 'EXECUTE') is false as ok,
       'authenticated cannot execute apply_purchase_effects directly' as description;
select has_function_privilege('authenticated', 'public.revert_purchase_effects()', 'EXECUTE') is false as ok,
       'authenticated cannot execute revert_purchase_effects directly' as description;

-- Known callable SECURITY DEFINER functions must pin search_path after the hardening migration.
select coalesce((select p.proconfig @> array['search_path=pg_catalog, public, extensions, pg_temp']
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_product_from_scanner' and p.prosecdef
  limit 1), false) as ok,
  'create_product_from_scanner pins search_path' as description;

select coalesce((select p.proconfig @> array['search_path=pg_catalog, public, extensions, pg_temp']
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'record_cash_register_movement' and p.prosecdef
  limit 1), false) as ok,
  'record_cash_register_movement pins search_path' as description;

select has_function_privilege('anon', 'public.create_product_from_scanner(uuid,text,text,text,numeric,numeric,text)', 'EXECUTE') is false as ok,
       'anon cannot execute scanner product onboarding directly' as description;

select * from finish();
rollback;
