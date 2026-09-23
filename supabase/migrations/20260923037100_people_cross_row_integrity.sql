-- Nüva People — cross-row integrity.
-- Reglas que dependen de la relación entre empleado y contrato se validan con triggers.

create or replace function public.people_validate_employee_timeline()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.birth_date is not null and new.birth_date > new.hire_date then
   raise exception 'La fecha de nacimiento no puede ser posterior al ingreso del trabajador';
 end if;
 return new;
end $$;
drop trigger if exists trg_people_employee_timeline on public.people_employees;
create trigger trg_people_employee_timeline before insert or update of birth_date,hire_date on public.people_employees for each row execute function public.people_validate_employee_timeline();

create or replace function public.people_validate_contract_timeline()
returns trigger language plpgsql security invoker set search_path=public as $$
declare v_hire date; v_term date;
begin
 select hire_date,termination_date into v_hire,v_term from public.people_employees where id=new.employee_id and business_id=new.business_id;
 if v_hire is not null and new.start_date < v_hire then raise exception 'El contrato no puede comenzar antes del ingreso del trabajador'; end if;
 if v_term is not null and new.start_date > v_term then raise exception 'El contrato no puede comenzar después del término del trabajador'; end if;
 if v_term is not null and new.end_date is not null and new.end_date > v_term then raise exception 'El contrato no puede terminar después del término del trabajador'; end if;
 if new.end_date is not null and new.end_date < new.start_date then raise exception 'La fecha de término del contrato no puede ser anterior al inicio'; end if;
 return new;
end $$;
drop trigger if exists trg_people_contract_timeline on public.people_contracts;
create trigger trg_people_contract_timeline before insert or update of employee_id,business_id,start_date,end_date on public.people_contracts for each row execute function public.people_validate_contract_timeline();

create unique index if not exists ux_people_payroll_period_business_month on public.people_payroll_periods(business_id,period_year,period_month);