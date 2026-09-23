begin;
select plan(14);

select is(public.people_valid_rut('12.345.678-5'), true, 'valid Chilean RUT accepted');
select is(public.people_valid_rut('12.345.678-6'), false, 'invalid Chilean RUT rejected');
select is(public.people_working_days_between(date '2026-09-14',date '2026-09-21'), 5::numeric, 'working days exclude weekend and holiday');
select is(public.people_accrued_vacation_days(date '2026-01-01',date '2026-09-01'), 10::numeric, 'vacation accrual is 1.25 days per full month');
select ok(has_function_privilege('authenticated','public.calculate_people_payroll_period(uuid)'::regprocedure,'EXECUTE'),'authenticated can execute payroll calculation');
select ok(has_function_privilege('authenticated','public.prepare_people_lre(uuid)'::regprocedure,'EXECUTE'),'authenticated can prepare LRE');
select ok(has_function_privilege('authenticated','public.generate_people_liquidations(uuid)'::regprocedure,'EXECUTE'),'authenticated can generate liquidations');
select ok(has_function_privilege('authenticated','public.post_people_payroll_to_finance(uuid)'::regprocedure,'EXECUTE'),'authenticated can hand off payroll to finance');
select ok(exists(select 1 from pg_constraint where conrelid='public.people_payroll_periods'::regclass and contype='u' and pg_get_constraintdef(oid) like '%(business_id, period_year, period_month)%'),'payroll periods are unique per business/month');
select ok(exists(select 1 from pg_constraint where conrelid='public.people_payroll_liquidations'::regclass and contype='u' and pg_get_constraintdef(oid) like '%(payroll_period_id, employee_id)%'),'liquidations are unique per period/employee');
select ok(position('v_unpaid_absence_days' in pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure))>0,'payroll engine accounts for unpaid absences');
select ok(position('people_valid_rut' in pg_get_functiondef('public.prepare_people_lre(uuid)'::regprocedure))>0,'LRE validates RUT');
select ok(has_function_privilege('authenticated','public.review_people_leave_request(uuid,text,boolean)'::regprocedure,'EXECUTE'),'authenticated can review leave requests');
select ok(position('FROM public.people_employees e' in pg_get_functiondef('public.review_people_leave_request(uuid,text,boolean)'::regprocedure))>0 AND position('FOR UPDATE;' in pg_get_functiondef('public.review_people_leave_request(uuid,text,boolean)'::regprocedure))>0,'leave approval serializes approvals per employee');

select * from finish();
rollback;
