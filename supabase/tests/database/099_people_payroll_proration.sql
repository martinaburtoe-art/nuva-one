begin;
select plan(8);

select ok(to_regprocedure('public.people_monthly_salary_for_period(numeric,date,date,date,date)') is not null,'partial-month salary helper exists');
select is(public.people_monthly_salary_for_period(1000000,date '2026-09-01',date '2026-09-30',date '2026-09-15',null),533333::numeric,'mid-month hire prorates by 16/30');
select is(public.people_monthly_salary_for_period(1000000,date '2026-09-01',date '2026-09-30',date '2026-09-01',date '2026-09-15'),500000::numeric,'mid-month termination prorates by 15/30');
select is(public.people_monthly_salary_for_period(1000000,date '2026-09-01',date '2026-09-30',date '2026-09-01',null),1000000::numeric,'full-month contract keeps full salary');
select ok(strpos(pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure),'v_period_salary') > 0,'payroll engine uses period salary');
select ok(strpos(pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure),'cl-2026.4') > 0,'payroll calculation version is 2026.4');
select ok(exists(select 1 from pg_constraint where conname='people_employees_active_pension_afp_ck'),'active pension requires AFP');
select ok(exists(select 1 from pg_trigger where tgname='people_payroll_inputs_afp_guard'),'payroll input AFP validity guard');

select * from finish();
rollback;