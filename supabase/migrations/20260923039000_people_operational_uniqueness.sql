-- Nüva People — unicidad operativa y contratos no solapados.
create unique index if not exists ux_people_payroll_inputs_employee_period on public.people_payroll_inputs(business_id,payroll_period_id,employee_id);
create unique index if not exists ux_people_payroll_items_employee_period on public.people_payroll_items(business_id,payroll_period_id,employee_id);
create unique index if not exists ux_people_payroll_liquidations_employee_period on public.people_payroll_liquidations(business_id,payroll_period_id,employee_id);
create unique index if not exists ux_people_lre_rows_employee_period on public.people_lre_rows(business_id,payroll_period_id,employee_id);

create or replace function public.people_validate_contract_overlap()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if exists (
   select 1 from public.people_contracts p
   where p.id<>new.id and p.business_id=new.business_id and p.employee_id=new.employee_id
     and new.start_date <= coalesce(p.end_date,'9999-12-31'::date)
     and p.start_date <= coalesce(new.end_date,'9999-12-31'::date)
 ) then raise exception 'El trabajador ya tiene un contrato vigente que se solapa con este período'; end if;
 return new;
end $$;
drop trigger if exists trg_people_contract_overlap on public.people_contracts;
create trigger trg_people_contract_overlap before insert or update on public.people_contracts for each row execute function public.people_validate_contract_overlap();
revoke execute on function public.people_validate_contract_overlap() from public,anon,authenticated;

create or replace function public.people_validate_employee_contracts()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.termination_date is not null and exists (
   select 1 from public.people_contracts c where c.employee_id=new.id and c.business_id=new.business_id and c.start_date>new.termination_date
 ) then raise exception 'La fecha de término del trabajador no puede ser anterior al inicio de un contrato'; end if;
 if new.termination_date is not null and exists (
   select 1 from public.people_contracts c where c.employee_id=new.id and c.business_id=new.business_id and c.end_date is not null and c.end_date>new.termination_date
 ) then raise exception 'La fecha de término del trabajador no puede ser anterior al término de un contrato'; end if;
 return new;
end $$;
drop trigger if exists trg_people_employee_contracts on public.people_employees;
create trigger trg_people_employee_contracts before update of termination_date,business_id on public.people_employees for each row execute function public.people_validate_employee_contracts();
revoke execute on function public.people_validate_employee_contracts() from public,anon,authenticated;