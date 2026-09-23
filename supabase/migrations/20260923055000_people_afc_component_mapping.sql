-- AFC employer component precision for LRE/payroll traceability.
DO $$
DECLARE v_def text; v_new text;
BEGIN
 SELECT pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure) INTO v_def;
 v_new:=replace(v_def,
 '''afc_employer'',v_afc_employer,''sis_employer''',
 '''afc_employer'',v_afc_employer,''afc_employer_cic'',case when lower(coalesce(v_contract.contract_type,v_employee.employment_type))=''indefinite'' then round(v_unemployment_base*0.016,0) else round(v_unemployment_base*0.028,0) end,''afc_employer_fcs'',case when lower(coalesce(v_contract.contract_type,v_employee.employment_type))=''indefinite'' then round(v_unemployment_base*0.008,0) else round(v_unemployment_base*0.002,0) end,''sis_employer''');
 v_new:=replace(v_new,'''cl-2026.10''','''cl-2026.11''');
 IF v_new=v_def THEN RAISE EXCEPTION 'Expected AFC component mapping not found'; END IF;
 EXECUTE v_new;
END $$;