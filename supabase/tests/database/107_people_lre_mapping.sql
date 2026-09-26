begin;
select plan(5);
select ok(position('lre_modules' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'LRE row has structured modules');
select ok(position('sueldo_base' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'LRE maps salary in structured payload');
select ok(position('prevision_afp' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'LRE maps AFP pension deduction');
select ok(position('aportes_empleador' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'LRE maps employer contributions');
select ok(position('LRE-2026.1' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'LRE mapping version is current');
select * from finish();
rollback;