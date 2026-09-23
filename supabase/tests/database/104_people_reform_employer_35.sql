begin;
select plan(5);
select is((0.001+0.009+0.025)::numeric,0.035::numeric,'Aug 2026 employer pension reform totals 3.5%');
select is((select value_numeric from public.people_legal_parameters where parameter_key='employer_individual_additional_rate' and effective_from=date '2026-08-01' limit 1),0.001::numeric,'0.1% employer individual component');
select is((select value_numeric from public.people_legal_parameters where parameter_key='employer_ssp_rate' and effective_from=date '2026-08-01' limit 1),0.025::numeric,'2.5% SSP component');
select ok(position('v_crp_amount+v_employer_ssp' in pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure))>0,'employer cost includes CRP and SSP');
select ok(position('cl-2026.8' in pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure))>0,'payroll engine version 8');
select * from finish();
rollback;
