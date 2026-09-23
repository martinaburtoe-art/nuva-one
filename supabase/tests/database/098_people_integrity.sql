begin;
select plan(12);

select ok(to_regclass('public.ux_people_payroll_inputs_employee_period') is not null,'payroll inputs unique index');
select ok(to_regclass('public.ux_people_payroll_items_employee_period') is not null,'payroll items unique index');
select ok(to_regclass('public.ux_people_payroll_liquidations_employee_period') is not null,'liquidations unique index');
select ok(to_regclass('public.ux_people_lre_rows_employee_period') is not null,'LRE rows unique index');
select ok(exists(select 1 from pg_trigger where tgname='trg_people_contract_overlap'),'contract overlap trigger');
select ok(exists(select 1 from pg_trigger where tgname='trg_people_employee_contracts'),'employee contract chronology trigger');
select ok(exists(select 1 from pg_trigger where tgname='trg_people_legal_parameter_overlap'),'legal parameter overlap trigger');
select ok(exists(select 1 from pg_trigger where tgname='trg_people_afp_overlap'),'AFP overlap trigger');
select ok((select count(*) from public.people_legal_parameters a join public.people_legal_parameters b on a.country_code=b.country_code and a.parameter_key=b.parameter_key and a.id<b.id and a.effective_from<=coalesce(b.effective_to,'9999-12-31'::date) and b.effective_from<=coalesce(a.effective_to,'9999-12-31'::date))=0,'legal parameter effectivity has no overlaps');
select ok((select count(*) from public.people_contracts a join public.people_contracts b on a.business_id=b.business_id and a.employee_id=b.employee_id and a.id<b.id and a.start_date<=coalesce(b.end_date,'9999-12-31'::date) and b.start_date<=coalesce(a.end_date,'9999-12-31'::date))=0,'existing contracts have no overlaps');
select ok(strpos(pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure),'v_unpaid_absence_days:=public.people_unpaid_absence_days') < strpos(pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure),'v_taxable:=greatest'),'payroll calculates absence deduction before taxable base');
select ok(strpos(pg_get_functiondef('public.people_unpaid_absence_days(uuid,date,date)'::regprocedure),'from public.people_absences pa') > 0,'unpaid absence helper uses non-shadowing alias');

select * from finish();
rollback;