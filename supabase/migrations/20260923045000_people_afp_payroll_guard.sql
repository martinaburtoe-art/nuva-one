-- Nüva People — AFP obligatoria y vigente para trabajadores con pensión activa.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.people_employees'::regclass
      and conname='people_employees_active_pension_afp_ck'
  ) then
    alter table public.people_employees
      add constraint people_employees_active_pension_afp_ck
      check (pension_status <> 'active' or nullif(btrim(afp_name),'') is not null);
  end if;
end $$;

create or replace function public.people_validate_payroll_input_afp()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  e record;
  p record;
  afp_count integer;
begin
  select pension_status, afp_name into e
  from public.people_employees
  where id = new.employee_id and business_id = new.business_id;

  if e.pension_status = 'active' then
    select period_year, period_month into p
    from public.people_payroll_periods
    where id = new.payroll_period_id and business_id = new.business_id;

    select count(*) into afp_count
    from public.people_afp_rates
    where country_code='CL'
      and lower(trim(afp_name)) = lower(trim(e.afp_name))
      and effective_from <= make_date(p.period_year,p.period_month,1)
      and (effective_to is null or effective_to >= make_date(p.period_year,p.period_month,1));

    if afp_count = 0 then
      raise exception 'AFP % has no valid rate for payroll period %-%', e.afp_name, p.period_year, lpad(p.period_month::text,2,'0');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists people_payroll_inputs_afp_guard on public.people_payroll_inputs;
create trigger people_payroll_inputs_afp_guard
before insert or update of employee_id, payroll_period_id, business_id
on public.people_payroll_inputs
for each row execute function public.people_validate_payroll_input_afp();

revoke execute on function public.people_validate_payroll_input_afp() from public, anon, authenticated;