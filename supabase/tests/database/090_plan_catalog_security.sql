begin;

select plan(2);

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'plan_catalog'),
  'plan_catalog has RLS enabled'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'plan_catalog'
      and policyname = 'plan_catalog_client_deny'
  ),
  'plan_catalog has an explicit client deny policy'
);

select * from finish();
rollback;
