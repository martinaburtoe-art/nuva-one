begin;
select plan(3);

select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_public_catalog'
      and not p.prosecdef
      and p.proconfig @> array['search_path=""']
  ),
  'public catalog RPC uses an invoker security model with an empty search_path'
);

select ok(
  has_function_privilege('anon', 'public.get_public_catalog(text)', 'execute'),
  'anonymous clients can execute the intentionally public catalog RPC'
);

select ok(
  not has_function_privilege('authenticated', 'public.get_public_catalog(text)', 'execute'),
  'authenticated role does not receive a broader catalog RPC grant'
);

select * from finish();
rollback;
