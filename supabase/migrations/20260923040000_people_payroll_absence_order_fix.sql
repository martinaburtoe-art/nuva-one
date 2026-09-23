-- Nüva People — fix payroll absence ordering.
-- La deducción por ausencias debe calcularse antes de construir la base imponible.

create or replace function public.calculate_people_payroll_period(p_payroll_period_id uuid)
returns jsonb language plpgsql security invoker set search_path=public,private as $$
declare
 v_period public.people_payroll_periods%rowtype; v_user uuid:=auth.uid(); v_period_start date; v_period_end date;
 v_param jsonb:='{}'::jsonb; v_uf numeric; v_pension_cap numeric; v_unemployment_cap numeric; v_sis numeric; v_crp numeric; v_health numeric; v_ot numeric;
 v_employee record; v_contract record; v_input record; v_input_found boolean; v_taxable numeric; v_non_taxable numeric; v_pension_base numeric; v_unemployment_base numeric;
 v_afp_commission numeric; v_afp_employee numeric; v_health_deduction numeric; v_afc_employee numeric; v_afc_employer numeric; v_sis_amount numeric; v_crp_amount numeric;
 v_overtime numeric; v_unpaid_absence_days numeric:=0; v_absence_deduction numeric:=0; v_income_tax numeric; v_deductions numeric; v_net numeric; v_employer_cost numeric; v_hourly numeric; v_warnings jsonb; v_components jsonb; v_bracket record; v_bracket_found boolean;
begin
 if v_user is null then raise exception 'authentication required'; end if;
 select * into v_period from public.people_payroll_periods where id=p_payroll_period_id;
 if not found then raise exception 'payroll period not found'; end if;
 if not private.has_business_role(v_period.business_id,v_user,array['owner','admin']::public.member_role[]) then raise exception 'owner/admin role required'; end if;
 if v_period.status in ('approved','closed','void') then raise exception 'payroll period is immutable in status %',v_period.status; end if;
 v_period_start:=make_date(v_period.period_year,v_period.period_month,1); v_period_end:=(v_period_start+interval '1 month - 1 day')::date;
 select coalesce(jsonb_object_agg(parameter_key,coalesce(to_jsonb(value_numeric),to_jsonb(value_text))),'{}'::jsonb) into v_param from (select distinct on(parameter_key) parameter_key,value_numeric,value_text from public.people_legal_parameters where country_code='CL' and effective_from<=v_period_end and (effective_to is null or effective_to>=v_period_start) order by parameter_key,effective_from desc) p;
 v_uf:=nullif(v_param->>'uf_value_clp','')::numeric; v_pension_cap:=nullif(v_param->>'pension_income_cap_uf','')::numeric*v_uf; v_unemployment_cap:=nullif(v_param->>'unemployment_income_cap_uf','')::numeric*v_uf;
 v_sis:=coalesce(nullif(v_param->>'sis_rate','')::numeric,0.0154); v_crp:=case when v_period_start>=date '2026-08-01' then coalesce(nullif(v_param->>'crp_rate','')::numeric,0.009) else 0 end; v_health:=coalesce(nullif(v_param->>'health_rate','')::numeric,0.07); v_ot:=coalesce(nullif(v_param->>'overtime_surcharge','')::numeric,0.50);
 if v_uf is null or v_pension_cap is null or v_unemployment_cap is null then raise exception 'missing UF/tope legal parameter for payroll period %/%',v_period.period_year,v_period.period_month; end if;
 delete from public.people_payroll_items where payroll_period_id=p_payroll_period_id;
 for v_employee in select e.* from public.people_employees e where e.business_id=v_period.business_id and e.employment_status='active' loop
  select c.* into v_contract from public.people_contracts c where c.employee_id=v_employee.id and c.business_id=v_period.business_id and c.status='active' and c.start_date<=v_period_end and (c.end_date is null or c.end_date>=v_period_start) order by c.start_date desc limit 1;
  if not found then continue; end if;
  select * into v_input from public.people_payroll_inputs where payroll_period_id=p_payroll_period_id and employee_id=v_employee.id; v_input_found:=found;
  v_warnings:='[]'::jsonb; v_afp_commission:=0; v_afp_employee:=0; v_health_deduction:=0; v_afc_employee:=0; v_afc_employer:=0; v_sis_amount:=0; v_crp_amount:=0; v_income_tax:=0;
  v_unpaid_absence_days:=public.people_unpaid_absence_days(v_employee.id,greatest(v_period_start,v_contract.start_date),least(v_period_end,coalesce(v_contract.end_date,v_period_end)));
  v_absence_deduction:=round((greatest(0,v_contract.salary_amount)/30.0)*coalesce(v_unpaid_absence_days,0),0);
  v_hourly:=case when coalesce(v_contract.weekly_hours,42)>0 then (v_contract.salary_amount/30*7/v_contract.weekly_hours) else 0 end;
  v_overtime:=round(v_hourly*(1+v_ot)*case when v_input_found then coalesce(v_input.overtime_hours,0) else coalesce(v_employee.overtime_hours,0) end,0);
  v_taxable:=greatest(0,coalesce(v_contract.salary_amount,0)-v_absence_deduction+v_overtime+case when v_input_found then coalesce(v_input.taxable_bonus,0) else coalesce(v_employee.taxable_bonus,0) end+case when v_input_found then coalesce(v_input.gratification_amount,0) else 0 end);
  v_non_taxable:=greatest(0,case when v_input_found then coalesce(v_input.non_taxable_bonus,0) else coalesce(v_employee.non_taxable_bonus,0) end);
  v_pension_base:=least(v_taxable,v_pension_cap); v_unemployment_base:=least(v_taxable,v_unemployment_cap);
  select coalesce(worker_commission,0) into v_afp_commission from public.people_afp_rates where country_code='CL' and afp_name=coalesce(v_employee.afp_name,'') and effective_from<=v_period_end and (effective_to is null or effective_to>=v_period_start) order by effective_from desc limit 1;
  if coalesce(v_employee.pension_status,'active')='active' and nullif(v_employee.afp_name,'') is null then v_warnings:=v_warnings||jsonb_build_array('AFP no configurada'); end if;
  v_afp_employee:=case when coalesce(v_employee.pension_status,'active')='active' then round(v_pension_base*(coalesce((select mandatory_rate from public.people_afp_rates where country_code='CL' and afp_name=coalesce(v_employee.afp_name,'') and effective_from<=v_period_end and (effective_to is null or effective_to>=v_period_start) order by effective_from desc limit 1),0.10)+coalesce(v_afp_commission,0)),0) else 0 end;
  if lower(coalesce(v_employee.health_system,'fonasa'))='isapre' then if coalesce(v_employee.health_plan_uf,0)>0 then v_health_deduction:=greatest(round(v_pension_base*v_health,0),round(v_employee.health_plan_uf*v_uf+coalesce(v_employee.health_additional_clp,0),0)); else v_health_deduction:=round(v_pension_base*v_health,0); v_warnings:=v_warnings||jsonb_build_array('Isapre sin plan UF configurado; se aplicó 7% legal'); end if; else v_health_deduction:=round(v_pension_base*v_health,0); end if;
  if lower(coalesce(v_contract.contract_type,v_employee.employment_type))='indefinite' then v_afc_employee:=round(v_unemployment_base*0.006,0); v_afc_employer:=round(v_unemployment_base*0.024,0); else v_afc_employee:=0; v_afc_employer:=round(v_unemployment_base*0.03,0); end if;
  v_sis_amount:=round(v_pension_base*v_sis,0); v_crp_amount:=round(v_pension_base*v_crp,0);
  select b.* into v_bracket from public.people_tax_brackets b where b.country_code='CL' and b.tax_type='IUSC' and b.period_year=v_period.period_year and b.period_month=v_period.period_month and v_taxable-v_afp_employee-v_health_deduction-v_afc_employee>=b.min_income and (b.max_income is null or v_taxable-v_afp_employee-v_health_deduction-v_afc_employee<=b.max_income) order by b.min_income desc limit 1;
  v_bracket_found:=found; if v_bracket_found then v_income_tax:=greatest(0,round((v_taxable-v_afp_employee-v_health_deduction-v_afc_employee)*v_bracket.factor-v_bracket.rebate,0)); else v_warnings:=v_warnings||jsonb_build_array('Tabla IUSC no cargada para el período'); end if;
  v_deductions:=v_afp_employee+v_health_deduction+v_afc_employee+v_income_tax+case when v_input_found then coalesce(v_input.other_deductions,0)+coalesce(v_input.advance_payment,0) else coalesce(v_employee.other_deductions,0) end;
  v_net:=greatest(0,round(v_taxable+v_non_taxable-v_deductions,0)); v_employer_cost:=round(v_taxable+v_afc_employer+v_sis_amount+v_crp_amount,0);
  v_components:=jsonb_build_object('salary',v_contract.salary_amount,'unpaid_absence_days',v_unpaid_absence_days,'unpaid_absence_deduction',v_absence_deduction,'overtime',v_overtime,'taxable_bonus',case when v_input_found then v_input.taxable_bonus else v_employee.taxable_bonus end,'non_taxable_bonus',v_non_taxable,'gratification',case when v_input_found then v_input.gratification_amount else 0 end,'afp_employee',v_afp_employee,'health',v_health_deduction,'afc_employee',v_afc_employee,'afc_employer',v_afc_employer,'sis_employer',v_sis_amount,'crp_employer',v_crp_amount,'pension_base',v_pension_base,'unemployment_base',v_unemployment_base,'uf_value',v_uf,'pension_cap',v_pension_cap,'unemployment_cap',v_unemployment_cap,'overtime_hourly_base',v_hourly);
  insert into public.people_payroll_items(business_id,payroll_period_id,employee_id,gross_taxable,gross_non_taxable,deductions,employer_cost_amount,net_pay,overtime_amount,vacation_amount,income_tax,social_security,components,warnings,calculation_version,parameter_snapshot) values(v_period.business_id,p_payroll_period_id,v_employee.id,v_taxable,v_non_taxable,v_deductions,v_employer_cost,v_net,v_overtime,0,v_income_tax,v_afp_employee+v_health_deduction+v_afc_employee+v_sis_amount+v_crp_amount,v_components,v_warnings,'cl-2026.3',v_param);
 end loop;
 update public.people_payroll_periods set status='calculated',calculated_at=now(),calculation_version='cl-2026.3',parameter_snapshot=v_param where id=p_payroll_period_id;
 return jsonb_build_object('period_id',p_payroll_period_id,'status','calculated','items',(select count(*) from public.people_payroll_items where payroll_period_id=p_payroll_period_id),'parameter_snapshot',v_param);
end $$;