-- Payroll engine correction: absence deductions must use the salary applicable to the payroll period.
DO $$
DECLARE
  v_def text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='calculate_people_payroll_period'
    AND pg_get_function_identity_arguments(p.oid)='p_payroll_period_id uuid';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'calculate_people_payroll_period(uuid) not found';
  END IF;

  v_new := replace(
    v_def,
    'v_absence_deduction:=round((greatest(0,v_contract.salary_amount)/30.0)*coalesce(v_unpaid_absence_days,0),0);',
    'v_absence_deduction:=round((greatest(0,v_period_salary)/30.0)*coalesce(v_unpaid_absence_days,0),0);'
  );

  v_new := replace(v_new, '''cl-2026.5''', '''cl-2026.6''');

  IF v_new = v_def THEN
    RAISE EXCEPTION 'Expected payroll absence deduction expression was not found';
  END IF;

  EXECUTE v_new;
END $$;
