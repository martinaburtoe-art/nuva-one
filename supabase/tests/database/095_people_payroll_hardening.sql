begin;
select plan(12);

select is(public.people_valid_rut('12.345.678-5'), true, 'valid Chilean RUT accepted');
select is(public.people_valid_rut('12.345.678-6'), false, 'invalid Chilean RUT rejected');
select is(public.people_working_days_between(date '2026-09-14',date '2026-09-21'), 5::numeric, 'working days exclude weekend and holiday');
select is(public.people_accrued_vacation_days(date '2026-01-01',date '2026-09-01'), 10::numeric, 'vacation accrual is 1.25 days per full month');
select has_function_privilege('authenticated','public.calculate_people_payroll_period(uuid)','execute', 'authenticated can execute payroll calculation');
select has_function_privilege('authenticated','public.prepare_people_lre(uuid)','execute', 'authenticated can prepare LRE');
select has_function_privilege('authenticated','public.generate_people_liquidations(uuid)','execute', 'authenticated can generate liquidations');
select has_function_privilege('authenticated','public.post_people_payroll_to_finance(uuid)','execute', 'authenticated can hand off payroll to finance');
select ok(exists(select 1 from pg_indexes where indexname='people_payroll_periods_business_month_uq'),'payroll periods are unique per business/month');
select ok(exists(select 1 from pg_indexes where indexname='people_payroll_liquidations_period_employee_uq'),'liquidations are unique per period/employee');
select ok(position('v_unpaid_absence_days' in pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure))>0,'payroll engine accounts for unpaid absences');
select ok(position('people_valid_rut' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'LRE validates RUT');

select * from finish();
rollback;
