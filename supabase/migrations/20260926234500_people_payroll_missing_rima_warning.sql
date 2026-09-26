-- Nüva People — final payroll hardening: explicit missing-RIMA warning.
DO $nuva$
DECLARE
  v_def text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure)
    INTO v_def;
  v_new := v_def;
  v_new := replace(
    v_new,
    'v_warnings:=''[]''::jsonb;',
    'v_warnings:=''[]''::jsonb; if v_medical_leave_days>0 and v_license_rima<=0 then v_warnings:=v_warnings||jsonb_build_array(''Licencia médica detectada sin RIMA del mes anterior; revisar cotizaciones de cargo del empleador''); end if;'
  );
  FOR n IN 2..11 LOOP
    v_new := replace(v_new, format('''cl-2026.%s''', n), '''cl-2026.12''');
  END LOOP;
  IF v_new <> v_def THEN
    EXECUTE v_new;
  END IF;
END $nuva$;
