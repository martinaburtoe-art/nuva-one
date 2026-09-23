-- Nüva People — el motor vigente calcula remuneraciones con sueldo base mensual.
alter table public.people_contracts
  add constraint people_contracts_salary_type_monthly_ck check (salary_type = 'monthly');

create or replace function public.people_validate_contract_hours()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  max_hours numeric;
begin
  max_hours := case when new.start_date >= date '2028-04-26' then 40 else 42 end;
  if new.weekly_hours > max_hours then
    raise exception 'weekly_hours exceeds Chile legal maximum of % hours for contract start date %', max_hours, new.start_date;
  end if;
  return new;
end;
$$;

drop trigger if exists people_contracts_hours_legal_guard on public.people_contracts;
create trigger people_contracts_hours_legal_guard
before insert or update of start_date, weekly_hours
on public.people_contracts
for each row execute function public.people_validate_contract_hours();

revoke execute on function public.people_validate_contract_hours() from public, anon, authenticated;