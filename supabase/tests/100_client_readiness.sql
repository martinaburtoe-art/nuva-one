begin;

-- The test intentionally creates no data and only inspects security metadata.
select plan(6);

select ok(
  exists (
    select 1 from pg_class c
    where c.oid = 'public.businesses_public'::regclass
      and c.reloptions @> array['security_invoker=true']
  ),
  'businesses_public is security invoker'
);

select ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'anon'
      and privilege_type in ('INSERT','UPDATE','DELETE')
      and table_name in ('customers','products','sales','purchases','transactions','quotes')
  ),
  'anon has no write grants on core tenant tables'
);

select ok(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_dashboard_kpis'
      and p.prosecdef = false
  ),
  'dashboard KPI RPC is security invoker'
);

select ok(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_dashboard_kpis'
  ),
  'dashboard KPI RPC exists'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_sales_business_sale_date_created_at'
  ),
  'sales tenant/date index exists'
);

select ok(
  not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_business_invites_pending_unique'
  ),
  'duplicate pending-invite index is removed'
);

select * from finish();
rollback;
