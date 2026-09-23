-- Nüva People — prorrateo de sueldo mensual por fracción de mes.
-- DT: el valor diario de una remuneración mensual se determina sobre 30 días
-- y se utiliza para remunerar fracciones de mes.
create or replace function public.people_monthly_salary_for_period(
  p_salary numeric,
  p_period_start date,
  p_period_end date,
  p_contract_start date,
  p_contract_end date
)
returns numeric
language plpgsql
immutable
set search_path=public
as $$
declare
  v_start date;
  v_end date;
  v_days numeric;
begin
  v_start:=greatest(p_period_start,p_contract_start);
  v_end:=least(p_period_end,coalesce(p_contract_end,p_period_end));
  if v_start>v_end then return 0; end if;
  if v_start=p_period_start and v_end=p_period_end then return greatest(0,p_salary); end if;
  v_days:=(v_end-v_start)+1;
  return round(greatest(0,p_salary)*(v_days/30.0),0);
end $$;

revoke execute on function public.people_monthly_salary_for_period(numeric,date,date,date,date)
from public,anon,authenticated;

do $$
declare d text;
begin
  select pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure) into d;
  d:=replace(d,'v_overtime numeric; v_unpaid_absence_days numeric:=0;','v_overtime numeric; v_period_salary numeric:=0; v_unpaid_absence_days numeric:=0;');
  d:=replace(d,'v_absence_deduction:=round((greatest(0,v_contract.salary_amount)/30.0)*coalesce(v_unpaid_absence_days,0),0);','v_period_salary:=public.people_monthly_salary_for_period(v_contract.salary_amount,v_period_start,v_period_end,v_contract.start_date,v_contract.end_date); v_absence_deduction:=round((greatest(0,v_contract.salary_amount)/30.0)*coalesce(v_unpaid_absence_days,0),0);');
  d:=replace(d,'v_taxable:=greatest(0,coalesce(v_contract.salary_amount,0)-v_absence_deduction+','v_taxable:=greatest(0,coalesce(v_period_salary,0)-v_absence_deduction+');
  d:=replace(d,'''salary'',v_contract.salary_amount,','''salary'',v_period_salary,');
  d:=replace(d,'and afp_name=coalesce(v_employee.afp_name,'''')','and lower(trim(afp_name))=lower(trim(coalesce(v_employee.afp_name,'''')))');
  execute d;
end $$;