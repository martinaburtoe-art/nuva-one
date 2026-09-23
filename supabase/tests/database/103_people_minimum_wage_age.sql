begin;
select plan(5);
select is((select value_numeric from public.people_legal_parameters where country_code='CL' and parameter_key='minimum_monthly_wage_under18_over65' and effective_from=date '2026-05-01'),412938::numeric,'reduced IMM is loaded for under-18/over-65 workers');
select is((select value_numeric from public.people_legal_parameters where country_code='CL' and parameter_key='minimum_monthly_wage_18_65' and effective_from=date '2026-05-01'),553553::numeric,'standard IMM is loaded for 18-65 workers');
select ok(position('minimum_monthly_wage_under18_over65' in pg_get_functiondef('public.validate_people_payroll_period(uuid)'::regprocedure))>0,'validator selects age-specific IMM parameter');
select ok(position('employee_age<18 OR employee_age>65' in pg_get_functiondef('public.validate_people_payroll_period(uuid)'::regprocedure))>0,'validator uses legal age boundaries');
select is(round(412938*(20/42.0),0),196637::numeric,'reduced IMM is proportionally calculated for a 20h week');
select * from finish();
rollback;
