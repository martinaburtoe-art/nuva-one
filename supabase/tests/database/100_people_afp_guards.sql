begin;
select plan(4);

select ok(exists(select 1 from pg_constraint where conname='people_employees_active_pension_afp_ck'),'active pension requires AFP');
select ok(exists(select 1 from pg_trigger where tgname='people_payroll_inputs_afp_guard'),'payroll input validates AFP');
select ok(position('lower(trim(afp_name))=lower(trim(coalesce(v_employee.afp_name' in pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure))>0,'payroll AFP lookup is case-insensitive');
select ok(position('cl-2026.5' in pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure))>0,'payroll engine version is current');

select * from finish();
rollback;
