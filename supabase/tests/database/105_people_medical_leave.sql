begin;
select plan(8);

select ok(to_regprocedure('public.people_medical_leave_days(uuid,date,date)') is not null,'medical leave helper exists');

select ok(
  position('NOT IN (''vacation'',''medical_leave'',''licencia_medica'',''licencia médica'')' in pg_get_functiondef('public.people_unpaid_absence_days(uuid,date,date)'::regprocedure))>0,
  'medical leave is excluded from unpaid absence deduction'
);

select ok(
  position('v_medical_leave_days' in pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure))>0,
  'payroll engine detects medical leave'
);

select ok(
  position('v_license_rima' in pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure))>0,
  'payroll engine supports RIMA'
);

select ok(
  position('v_license_ssp' in pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure))>0,
  'payroll engine calculates employer medical-leave social security'
);

select ok(
  position('Licencia médica detectada sin RIMA' in pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure))>0,
  'missing RIMA produces an explicit payroll warning'
);

select ok(
  position('cl-2026.9' in pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure))>0,
  'payroll engine version is 9'
);

select ok(
  EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_payroll_inputs_medical_leave_rima_nonnegative_ck'),
  'RIMA input cannot be negative'
);

select * from finish();
rollback;