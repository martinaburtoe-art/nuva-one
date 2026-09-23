-- Nüva People — Reforma previsional: tramo vigente desde remuneraciones de agosto 2026.
-- 0,1% cuenta individual + 0,9% CRP + 2,5% SSP = 3,5%, todo de cargo empleador.
-- Fuente: Ley 21.735 / Superintendencia de Pensiones.

ALTER TABLE public.people_payroll_items
  ADD COLUMN IF NOT EXISTS employer_pension_additional numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_ssp numeric NOT NULL DEFAULT 0;

INSERT INTO public.people_legal_parameters
(country_code,parameter_key,value_numeric,effective_from,effective_to,source_url,source_reference,notes)
VALUES
('CL','employer_individual_additional_rate',0.001,'2026-08-01',NULL,'https://www.spensiones.cl/','Ley 21.735 art. cuarto transitorio','0,1% de cargo del empleador desde remuneraciones de agosto 2026'),
('CL','employer_ssp_rate',0.025,'2026-08-01',NULL,'https://www.spensiones.cl/','Ley 21.735 art. cuarto transitorio','2,5% destinado al Seguro Social Previsional desde remuneraciones de agosto 2026')
ON CONFLICT DO NOTHING;

DO $$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure) INTO d;
  d:=replace(d,'v_sis_amount numeric; v_crp_amount numeric;','v_sis_amount numeric; v_crp_amount numeric; v_employer_individual_additional numeric; v_employer_ssp numeric;');
  d:=replace(d,'v_sis_amount:=0; v_crp_amount:=0; v_income_tax:=0;','v_sis_amount:=0; v_crp_amount:=0; v_employer_individual_additional:=0; v_employer_ssp:=0; v_income_tax:=0;');
  d:=replace(d,'v_sis_amount:=round(v_pension_base*v_sis,0); v_crp_amount:=round(v_pension_base*v_crp,0);','v_sis_amount:=round(v_pension_base*v_sis,0); v_crp_amount:=round(v_pension_base*v_crp,0); v_employer_individual_additional:=case when v_period_start>=date ''2026-08-01'' then round(v_pension_base*coalesce(nullif(v_param->>''employer_individual_additional_rate'','''')::numeric,0.001),0) else 0 end; v_employer_ssp:=case when v_period_start>=date ''2026-08-01'' then round(v_pension_base*coalesce(nullif(v_param->>''employer_ssp_rate'','''')::numeric,0.025),0) else v_sis_amount end;');
  d:=replace(d,'v_employer_cost:=round(v_taxable+v_afc_employer+v_employer_individual_additional+v_employer_ssp,0);','v_employer_cost:=round(v_taxable+v_afc_employer+v_employer_individual_additional+v_crp_amount+v_employer_ssp,0);');
  d:=replace(d,'''sis_employer'',v_sis_amount,''crp_employer'',v_crp_amount,','''sis_employer'',v_sis_amount,''crp_employer'',v_crp_amount,''employer_individual_additional'',v_employer_individual_additional,''employer_ssp'',v_employer_ssp,');
  d:=replace(d,'v_afp_employee+v_health_deduction+v_afc_employee+v_sis_amount+v_crp_amount,v_components','v_afp_employee+v_health_deduction+v_afc_employee,v_components');
  d:=replace(d,'''cl-2026.7''','''cl-2026.8''');
  d:=replace(d,'calculation_version=''cl-2026.6''','calculation_version=''cl-2026.8''');
  EXECUTE d;
END $$;
