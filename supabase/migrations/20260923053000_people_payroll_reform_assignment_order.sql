-- Payroll reform precision: calculate the license-employer contribution before composing
-- SIS/SSP, preventing a PL/pgSQL assignment-order defect.
DO $$
DECLARE v_def text; v_new text;
BEGIN
 SELECT pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure) INTO v_def;
 v_new:=replace(v_def,
 'v_sis_amount:=case when v_period_start<date ''2026-08-01'' then round(v_pension_base*v_sis,0)+v_license_ssp else 0 end; v_crp_amount:=round(v_pension_base*v_crp,0); v_employer_individual_additional:=case when v_period_start>=date ''2026-08-01'' then round(v_pension_base*coalesce(nullif(v_param->>''employer_individual_additional_rate'','''')::numeric,0.001),0) else 0 end; v_license_ssp:=case when v_medical_leave_days>0 and v_license_rima>0 then round(least(v_license_rima,v_pension_cap)*case when v_period_start>=date ''2026-08-01'' then coalesce(nullif(v_param->>''employer_ssp_rate'','''')::numeric,0.025) else v_sis end*(v_medical_leave_days/30.0),0) else 0 end; v_employer_ssp:=case when v_period_start>=date ''2026-08-01'' then round(v_pension_base*coalesce(nullif(v_param->>''employer_ssp_rate'','''')::numeric,0.025),0)+v_license_ssp else v_sis_amount end;',
 'v_license_ssp:=case when v_medical_leave_days>0 and v_license_rima>0 then round(least(v_license_rima,v_pension_cap)*case when v_period_start>=date ''2026-08-01'' then coalesce(nullif(v_param->>''employer_ssp_rate'','''')::numeric,0.025) else v_sis end*(v_medical_leave_days/30.0),0) else 0 end; v_sis_amount:=case when v_period_start<date ''2026-08-01'' then round(v_pension_base*v_sis,0) else 0 end; v_crp_amount:=round(v_pension_base*v_crp,0); v_employer_individual_additional:=case when v_period_start>=date ''2026-08-01'' then round(v_pension_base*coalesce(nullif(v_param->>''employer_individual_additional_rate'','''')::numeric,0.001),0) else 0 end; v_employer_ssp:=case when v_period_start>=date ''2026-08-01'' then round(v_pension_base*coalesce(nullif(v_param->>''employer_ssp_rate'','''')::numeric,0.025),0)+v_license_ssp else v_sis_amount+v_license_ssp end;');
 v_new:=replace(v_new,'''cl-2026.9''','''cl-2026.10''');
 IF v_new=v_def THEN RAISE EXCEPTION 'Expected reform calculation block not found'; END IF;
 EXECUTE v_new;
END $$;