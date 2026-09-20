begin;
select plan(3);

select ok(to_regclass('public.agentes_historial') is not null, 'agentes_historial exists');
select ok(not has_table_privilege('anon', 'public.agentes_historial', 'SELECT'), 'anon cannot read internal agent history');
select ok(not has_table_privilege('authenticated', 'public.agentes_historial', 'SELECT'), 'authenticated cannot read internal agent history');

select * from finish();
rollback;
