begin;
select plan(5);
select ok(position('sueldo_base' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'LRE payload uses descriptive salary key');
select ok(position('bono_taxable' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'taxable bonus is not falsely split into fixed and variable');
select ok(position('prevision_afp' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'pension deduction is descriptive');
select ok(position('''2101_sueldo''' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))=0,'invented DT numeric code is removed');
select ok(position('LRE-2026.1' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'LRE internal format remains versioned');
select * from finish();
rollback;