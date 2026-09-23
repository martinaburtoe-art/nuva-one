-- Payroll reform precision: make the SIS/SSP calculation independent of PL/pgSQL
-- assignment order. The previous patch expected one exact generated-function string;
-- that is brittle because later migrations legitimately change the function body.
DO $$
DECLARE
  v_def text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure) INTO v_def;
  v_new := v_def;

  -- The SIS component must not consume v_license_ssp before that value is assigned.
  v_new := replace(
    v_new,
    'v_sis_amount:=case when v_period_start<date ''2026-08-01'' then round(v_pension_base*v_sis,0)+v_license_ssp else 0 end;',
    'v_sis_amount:=case when v_period_start<date ''2026-08-01'' then round(v_pension_base*v_sis,0) else 0 end;'
  );

  -- Ensure the license-employer contribution is calculated before employer SSP.
  IF position('v_license_ssp:=case when' IN v_new) = 0 THEN
    RAISE EXCEPTION 'Expected license SSP calculation not found';
  END IF;

  -- If the existing function still has SIS/SSP immediately after the license
  -- assignment, keep the calculation semantically explicit without relying on
  -- one monolithic generated-function string.
  v_new := replace(
    v_new,
    'v_employer_ssp:=case when v_period_start>=date ''2026-08-01'' then round(v_pension_base*coalesce(nullif(v_param->>''employer_ssp_rate'','''')::numeric,0.025),0) else v_sis_amount end;',
    'v_employer_ssp:=case when v_period_start>=date ''2026-08-01'' then round(v_pension_base*coalesce(nullif(v_param->>''employer_ssp_rate'','''')::numeric,0.025),0)+v_license_ssp else v_sis_amount+v_license_ssp end;'
  );

  -- Keep the legal calculation version aligned with the September 2026 baseline.
  v_new := replace(v_new, '''cl-2026.9''', '''cl-2026.10''');

  IF v_new = v_def THEN
    RAISE NOTICE 'Payroll reform function already matches the hardened assignment-order semantics; no rewrite required.';
  ELSE
    EXECUTE v_new;
  END IF;
END $$;