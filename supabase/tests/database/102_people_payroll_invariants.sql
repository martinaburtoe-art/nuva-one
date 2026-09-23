begin;
select plan(6);

select ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='people_employees_taxable_bonus_nonnegative_ck'
  ),
  'employee taxable bonus is non-negative'
);

select ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='people_payroll_inputs_advance_nonnegative_ck'
  ),
  'payroll advance is non-negative'
);

select ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='people_payroll_items_amounts_nonnegative_ck'
  ),
  'calculated payroll amounts are non-negative'
);

select ok(
  position('v_period_salary)/30.0' in pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure))>0,
  'absence deduction uses period-applicable salary'
);

select ok(
  position('cl-2026.6' in pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure))>0,
  'payroll engine version is 6'
);

select is(
  public.people_monthly_salary_for_period(1000000, date '2026-09-01', date '2026-09-30', date '2026-09-15', null),
  533333::numeric,
  'partial-month salary remains correctly prorated'
);

select * from finish();
rollback;
