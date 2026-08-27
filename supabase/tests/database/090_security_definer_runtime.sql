begin;
select plan(6);

select has_function_privilege('authenticated','public.apply_sale_effects()','EXECUTE') is false as ok,
       'authenticated cannot execute apply_sale_effects directly' as description;
select has_function_privilege('authenticated','public.revert_sale_effects()','EXECUTE') is false as ok,
       'authenticated cannot execute revert_sale_effects directly' as description;
select has_function_privilege('authenticated','public.apply_purchase_effects()','EXECUTE') is false as ok,
       'authenticated cannot execute apply_purchase_effects directly' as description;
select has_function_privilege('authenticated','public.revert_purchase_effects()','EXECUTE') is false as ok,
       'authenticated cannot execute revert_purchase_effects directly' as description;

select exists (
  select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='create_product_from_scanner' and p.prosecdef
    and p.proconfig @> array['search_path=pg_catalog, public, private, extensions']
) as ok, 'scanner onboarding pins SECURITY DEFINER search_path in private' as description;

select exists (
  select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='record_cash_register_movement' and p.prosecdef
    and p.proconfig @> array['search_path=pg_catalog, public, private, extensions']
) as ok, 'cash register mutation pins SECURITY DEFINER search_path in private' as description;

select * from finish();
rollback;
