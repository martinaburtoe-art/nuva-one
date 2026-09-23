begin;
select plan(15);

select ok(exists(select 1 from pg_constraint where conname='people_employees_hire_before_termination_ck'),'employee hire/termination chronology');
select ok(exists(select 1 from pg_constraint where conname='people_employees_dependents_nonnegative_ck'),'employee dependents nonnegative');
select ok(exists(select 1 from pg_constraint where conname='people_contracts_end_after_start_ck'),'contract date chronology');
select ok(exists(select 1 from pg_constraint where conname='people_contracts_work_days_max_ck'),'contract work days bounded');
select ok(exists(select 1 from pg_constraint where conname='people_documents_expiry_after_issue_ck'),'document date chronology');
select ok(exists(select 1 from pg_constraint where conname='people_tax_brackets_factor_range_ck'),'tax factor bounded');
select ok(exists(select 1 from pg_constraint where conname='people_afp_rates_mandatory_rate_range_ck'),'AFP mandatory rate bounded');
select ok(exists(select 1 from pg_constraint where conname='people_vacation_balances_equation_ck'),'vacation balance equation guard');
select ok(exists(select 1 from pg_constraint where conname='people_legal_parameters_effectivity_range_ck'),'legal parameter chronology');
select ok(exists(select 1 from pg_constraint where conname='people_lre_rows_validation_status_ck'),'LRE status guard');
select ok(exists(select 1 from pg_constraint where conname='people_payroll_runs_status_ck'),'payroll run status guard');
select ok(exists(select 1 from pg_constraint where conname='people_payroll_postings_status_ck'),'payroll posting status guard');
select ok(exists(select 1 from pg_constraint where conname='people_payroll_liquidations_status_ck'),'liquidation status guard');
select ok(exists(select 1 from pg_constraint where conname='people_payroll_items_net_equation_ck'),'payroll net equation guard');
select ok(
  (select count(*) from public.people_employees where termination_date is not null and termination_date < hire_date)=0
  and (select count(*) from public.people_contracts where end_date is not null and end_date < start_date)=0
  and (select count(*) from public.people_documents where expiry_date is not null and issue_date is not null and expiry_date < issue_date)=0,
  'existing People chronology data is clean'
);

select * from finish();
rollback;
