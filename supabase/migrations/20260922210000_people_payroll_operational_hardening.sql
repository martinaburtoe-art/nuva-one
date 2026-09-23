-- Nüva People — operational hardening 2026.09
-- Official references reviewed: Dirección del Trabajo 2026 and SII IUSC 2026.

CREATE UNIQUE INDEX IF NOT EXISTS people_payroll_periods_business_month_uq
  ON public.people_payroll_periods(business_id, period_year, period_month);

CREATE UNIQUE INDEX IF NOT EXISTS people_payroll_liquidations_period_employee_uq
  ON public.people_payroll_liquidations(payroll_period_id, employee_id);

CREATE OR REPLACE FUNCTION public.people_working_days_between(p_start date, p_end date)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE d date := p_start; n numeric := 0;
BEGIN
  IF p_end < p_start THEN RETURN 0; END IF;
  WHILE d <= p_end LOOP
    IF extract(isodow FROM d) BETWEEN 1 AND 5
       AND NOT EXISTS (
         SELECT 1 FROM public.people_chile_holidays h
         WHERE h.holiday_date=d AND NOT h.is_working_holiday
       ) THEN n := n + 1; END IF;
    d := d + 1;
  END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.people_accrued_vacation_days(p_hire_date date, p_as_of date)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE full_months integer; rem_days integer; a interval;
BEGIN
  IF p_as_of < p_hire_date THEN RETURN 0; END IF;
  a := age(p_as_of, p_hire_date);
  full_months := extract(year FROM a)::int * 12 + extract(month FROM a)::int;
  rem_days := extract(day FROM a)::int;
  RETURN round(full_months * 1.25 + (rem_days / 30.0) * 1.25, 3);
END $$;

CREATE OR REPLACE FUNCTION public.calculate_people_vacation_balance(
  p_employee_id uuid, p_as_of_date date DEFAULT CURRENT_DATE
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,private AS $$
DECLARE e record; accrued numeric; used numeric; pending numeric;
BEGIN
  SELECT * INTO e FROM public.people_employees WHERE id=p_employee_id;
  IF NOT FOUND OR NOT private.is_business_member(e.business_id,auth.uid()) THEN
    RAISE EXCEPTION 'employee not accessible';
  END IF;
  accrued := public.people_accrued_vacation_days(e.hire_date,p_as_of_date);
  SELECT COALESCE(sum(public.people_working_days_between(a.starts_on,a.ends_on)),0)
    INTO used
    FROM public.people_absences a
   WHERE a.employee_id=p_employee_id AND a.business_id=e.business_id
     AND a.absence_type='vacation' AND a.starts_on>=e.hire_date AND a.ends_on<=p_as_of_date;
  pending := greatest(0,accrued-used);
  INSERT INTO public.people_vacation_balances(business_id,employee_id,as_of_date,accrued_days,used_days,pending_days)
  VALUES(e.business_id,p_employee_id,p_as_of_date,accrued,used,pending)
  ON CONFLICT(employee_id,as_of_date) DO UPDATE SET accrued_days=EXCLUDED.accrued_days,used_days=EXCLUDED.used_days,pending_days=EXCLUDED.pending_days;
  RETURN jsonb_build_object('employee_id',p_employee_id,'as_of_date',p_as_of_date,'accrued_days',accrued,'used_days',used,'pending_days',pending);
END $$;

CREATE OR REPLACE FUNCTION public.people_unpaid_absence_days(p_employee_id uuid,p_start date,p_end date)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE d date:=p_start; n numeric:=0;
BEGIN
  IF p_end<p_start THEN RETURN 0; END IF;
  WHILE d<=p_end LOOP
    IF EXISTS(
      SELECT 1 FROM public.people_absences a
      WHERE a.employee_id=p_employee_id AND a.starts_on<=d AND a.ends_on>=d
        AND COALESCE(a.paid,false)=false AND COALESCE(a.absence_type,'')<>'vacation'
    ) THEN n:=n+1; END IF;
    d:=d+1;
  END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.people_valid_rut(p_rut text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE r text; body text; dv text; s integer:=0; f integer:=2; digit integer; calc text;
BEGIN
  r:=upper(regexp_replace(coalesce(p_rut,''),'[^0-9Kk]','','g'));
  IF length(r)<2 THEN RETURN false; END IF;
  body:=left(r,length(r)-1); dv:=right(r,1);
  IF body !~ '^[0-9]+$' THEN RETURN false; END IF;
  FOR digit IN REVERSE length(body)..1 LOOP
    s:=s+(substr(body,digit,1)::integer*f); f:=f+1; IF f>7 THEN f:=2; END IF;
  END LOOP;
  calc:=CASE WHEN 11-(s%11)=11 THEN '0' WHEN 11-(s%11)=10 THEN 'K' ELSE (11-(s%11))::text END;
  RETURN calc=dv;
END $$;

-- Keep the existing payroll engine and harden the variable-input and absence paths without
-- duplicating the entire function body in this migration.
DO $$
DECLARE src text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO src
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='calculate_people_payroll_period'
    AND pg_get_function_identity_arguments(p.oid)='p_payroll_period_id uuid';
  src:=replace(src,'v_overtime numeric; v_income_tax numeric;','v_overtime numeric; v_unpaid_absence_days numeric; v_absence_deduction numeric; v_income_tax numeric;');
  src:=replace(src,'v_non_taxable:=greatest(0,CASE WHEN v_input_found THEN COALESCE(v_input.non_taxable_bonus,0) ELSE COALESCE(v_employee.non_taxable_bonus,0) END);','v_non_taxable:=greatest(0,CASE WHEN v_input_found THEN COALESCE(v_input.non_taxable_bonus,0) ELSE COALESCE(v_employee.non_taxable_bonus,0) END); v_unpaid_absence_days:=public.people_unpaid_absence_days(v_employee.id,greatest(v_period_start,v_contract.start_date),least(v_period_end,COALESCE(v_contract.end_date,v_period_end))); v_absence_deduction:=round((greatest(0,v_contract.salary_amount)/30.0)*v_unpaid_absence_days,0);');
  src:=replace(src,'v_taxable:=greatest(0,COALESCE(v_contract.salary_amount,0)+v_overtime+','v_taxable:=greatest(0,COALESCE(v_contract.salary_amount,0)-v_absence_deduction+v_overtime+');
  src:=replace(src,'v_components:=jsonb_build_object(''salary'',v_contract.salary_amount,','v_components:=jsonb_build_object(''salary'',v_contract.salary_amount,''unpaid_absence_days'',v_unpaid_absence_days,''unpaid_absence_deduction'',v_absence_deduction,');
  src:=replace(src,'SELECT * INTO v_input FROM public.people_payroll_inputs WHERE payroll_period_id=p_payroll_period_id AND employee_id=v_employee.id;','SELECT * INTO v_input FROM public.people_payroll_inputs WHERE payroll_period_id=p_payroll_period_id AND employee_id=v_employee.id ORDER BY updated_at DESC LIMIT 1;');
  EXECUTE src;
END $$;

-- Strengthen LRE validation: valid Chilean RUT and arithmetic consistency.
DO $$
DECLARE src text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO src
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='prepare_people_lre'
    AND pg_get_function_identity_arguments(p.oid)='p_payroll_period_id uuid';
  src:=replace(src,'IF e.national_id IS NULL OR btrim(e.national_id)='''' THEN errors:=errors||jsonb_build_array(''RUT del trabajador faltante''); END IF;','IF NOT public.people_valid_rut(e.national_id) THEN errors:=errors||jsonb_build_array(''RUT del trabajador inválido o faltante''); END IF;');
  src:=replace(src,'IF i.gross_taxable<0 OR i.net_pay<0 THEN errors:=errors||jsonb_build_array(''Montos negativos inválidos''); END IF;','IF i.gross_taxable<0 OR i.gross_non_taxable<0 OR i.deductions<0 OR i.net_pay<0 OR i.employer_cost_amount<0 THEN errors:=errors||jsonb_build_array(''Montos negativos inválidos''); END IF; IF abs((i.gross_taxable+i.gross_non_taxable-i.deductions)-i.net_pay)>1 THEN errors:=errors||jsonb_build_array(''El líquido no cuadra con haberes y descuentos''); END IF;');
  EXECUTE src;
END $$;
