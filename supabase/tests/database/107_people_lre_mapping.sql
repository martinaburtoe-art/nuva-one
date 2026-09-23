begin;
select plan(5);
select ok(position('lre_modules' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'LRE row has structured modules');
select ok(position('2101_sueldo' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'LRE maps salary');
select ok(position('3141_prevision' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'LRE maps pension deduction');
select ok(position('aportes_empleador' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'LRE maps employer contributions');
select ok(position('LRE-2026.1' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'LRE mapping version is current');
select * from finish();
rollback;