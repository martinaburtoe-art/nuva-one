begin;
select plan(3);

select ok(to_regclass('public.agentes_historial') is null or not has_table_privilege('anon', 'public.agentes_historial', 'SELECT'), 'anon cannot read internal agent history when table exists');
select ok(to_regclass('public.agentes_historial') is null or not has_table_privilege('authenticated', 'public.agentes_historial', 'SELECT'), 'authenticated cannot read internal agent history when table exists');
select ok(to_regclass('public.agentes_historial') is null, 'optional internal agent history table is absent from the clean schema');

select * from finish();
rollback;
