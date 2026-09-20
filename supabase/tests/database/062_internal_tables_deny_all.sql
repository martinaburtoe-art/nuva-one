begin;
select plan(4);

select ok(to_regclass('public.agentes_historial') is null or not has_table_privilege('anon', 'public.agentes_historial', 'SELECT'), 'anon cannot read internal agent history when table exists');
select ok(to_regclass('public.agentes_historial') is null or not has_table_privilege('authenticated', 'public.agentes_historial', 'SELECT'), 'authenticated cannot read internal agent history when table exists');
select ok(to_regclass('public.ops_incidents') is null or not has_table_privilege('anon', 'public.ops_incidents', 'SELECT'), 'anon cannot read internal ops incidents when table exists');
select ok(to_regclass('public.ops_incidents') is null or not has_table_privilege('authenticated', 'public.ops_incidents', 'SELECT'), 'authenticated cannot read internal ops incidents when table exists');

select * from finish();
rollback;
