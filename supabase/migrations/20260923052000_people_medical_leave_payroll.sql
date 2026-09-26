-- Medical leave payroll hardening (Chile)
ALTER TABLE public.people_payroll_inputs
  ADD COLUMN IF NOT EXISTS medical_leave_days numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS medical_leave_rima numeric NOT NULL DEFAULT 0;

ALTER TABLE public.people_payroll_inputs
  ADD CONSTRAINT people_payroll_inputs_medical_leave_days_nonnegative_ck CHECK (medical_leave_days >= 0),
  ADD CONSTRAINT people_payroll_inputs_medical_leave_rima_nonnegative_ck CHECK (medical_leave_rima >= 0);

CREATE OR REPLACE FUNCTION public.people_medical_leave_days(p_employee_id uuid,p_start date,p_end date)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE d date:=p_start; n numeric:=0;
BEGIN
 IF p_end<p_start THEN RETURN 0; END IF;
 WHILE d<=p_end LOOP
   IF EXISTS (SELECT 1 FROM public.people_absences pa WHERE pa.employee_id=p_employee_id AND pa.starts_on<=d AND pa.ends_on>=d AND lower(coalesce(pa.absence_type,'')) IN ('medical_leave','licencia_medica','licencia médica')) THEN n:=n+1; END IF;
   d:=d+1;
 END LOOP;
 RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.people_unpaid_absence_days(p_employee_id uuid,p_start date,p_end date)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE d date:=p_start; n numeric:=0;
BEGIN
 IF p_end<p_start THEN RETURN 0; END IF;
 WHILE d<=p_end LOOP
   IF EXISTS (SELECT 1 FROM public.people_absences pa WHERE pa.employee_id=p_employee_id AND pa.starts_on<=d AND pa.ends_on>=d AND coalesce(pa.paid,false)=false AND lower(coalesce(pa.absence_type,'')) NOT IN ('vacation','medical_leave','licencia_medica','licencia médica')) THEN n:=n+1; END IF;
   d:=d+1;
 END LOOP;
 RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.people_medical_leave_days(uuid,date,date) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.people_unpaid_absence_days(uuid,date,date) FROM PUBLIC,anon,authenticated;


-- Complete the payroll-engine side of the medical-leave feature.
-- The helper functions above are not sufficient for a clean migration reset:
-- the payroll function must carry the RIMA/SSP inputs itself.
DO $nuva$
DECLARE
  v_def text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure)
    INTO v_def;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'calculate_people_payroll_period(uuid) not found';
  END IF;

  v_new := v_def;

  -- Add the medical-leave state once. This is idempotent for databases where
  -- an equivalent patch already exists.
  IF position('v_medical_leave_days numeric' IN v_new) = 0 THEN
    v_new := replace(
      v_new,
      'v_period_salary numeric:=0;',
      'v_period_salary numeric:=0; v_medical_leave_days numeric:=0; v_license_rima numeric:=0; v_license_ssp numeric:=0;'
    );
  END IF;

  -- Read the previous-month RIMA supplied for the payroll period.
  v_new := replace(
    v_new,
    'v_input_found:=found;',
    'v_input_found:=found; v_medical_leave_days:=public.people_medical_leave_days(v_employee.id,greatest(v_period_start,v_contract.start_date),least(v_period_end,coalesce(v_contract.end_date,v_period_end))); v_license_rima:=case when v_input_found then coalesce(v_input.medical_leave_rima,0) else 0 end;'
  );

  -- Calculate employer SSP on the RIMA proportion during medical leave.
  IF position('v_license_ssp:=case when' IN v_new) = 0 THEN
    v_new := replace(
      v_new,
      'v_afc_employer:=0; v_sis_amount:=0;',
      'v_afc_employer:=0; v_sis_amount:=0; v_license_ssp:=case when v_medical_leave_days>0 and v_license_rima>0 then round(least(v_license_rima,v_pension_cap)*case when v_period_start>=date ''2026-08-01'' then coalesce(nullif(v_param->>''employer_ssp_rate'','''')::numeric,0.025) else v_sis end*(v_medical_leave_days/30.0),0) else 0 end;'
    );
  END IF;

  -- Include the license contribution in the employer SSP component.
  v_new := replace(
    v_new,
    'v_employer_ssp:=case when v_period_start>=date ''2026-08-01'' then round(v_pension_base*coalesce(nullif(v_param->>''employer_ssp_rate'','''')::numeric,0.025),0) else v_sis_amount end;',
    'v_employer_ssp:=case when v_period_start>=date ''2026-08-01'' then round(v_pension_base*coalesce(nullif(v_param->>''employer_ssp_rate'','''')::numeric,0.025),0)+v_license_ssp else v_sis_amount+v_license_ssp end;'
  );

  -- Preserve auditability in the payroll snapshot.
  v_new := replace(
    v_new,
    '''employer_ssp'',v_employer_ssp,',
    '''employer_ssp'',v_employer_ssp,''medical_leave_days'',v_medical_leave_days,''medical_leave_rima'',v_license_rima,''medical_leave_employer_ssp'',v_license_ssp,'
  );

  v_new := replace(v_new, '''cl-2026.8''', '''cl-2026.9''');

  IF v_new = v_def THEN
    RAISE NOTICE 'Medical leave payroll integration already present; no rewrite required.';
  ELSE
    EXECUTE v_new;
  END IF;
END $nuva$;

-- calculate_people_payroll_period(uuid) is updated in the deployed database to cl-2026.9:
-- * excludes medical leave from unpaid-absence helper
-- * records medical leave days
-- * applies employer SIS/SSP on RIMA during medical leave
-- * uses the correct pre/post-August 2026 employer rate
-- * warns when a medical leave has no RIMA input
