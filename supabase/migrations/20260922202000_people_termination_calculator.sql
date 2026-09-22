-- Nüva People — finiquito calculator
CREATE OR REPLACE FUNCTION public.calculate_people_termination(
  p_employee_id uuid,
  p_termination_date date,
  p_termination_cause text,
  p_notice_given boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path=public,private
AS $$
DECLARE
  e record; c record; b record;
  v_business_id uuid;
  v_service interval;
  v_years integer;
  v_months integer;
  v_days integer;
  v_service_years numeric := 0;
  v_vacation_habiles numeric := 0;
  v_calendar_days numeric := 0;
  v_cursor date;
  v_business_days integer := 0;
  v_target_days integer;
  v_notice numeric := 0;
  v_severance numeric := 0;
  v_vacation numeric := 0;
  v_total numeric := 0;
  v_warning jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO e FROM public.people_employees WHERE id=p_employee_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'employee not found'; END IF;
  v_business_id := e.business_id;
  IF NOT private.has_business_role(v_business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]) THEN
    RAISE EXCEPTION 'owner/admin role required';
  END IF;

  SELECT * INTO c FROM public.people_contracts
  WHERE employee_id=p_employee_id AND business_id=v_business_id
    AND status='active' AND start_date <= p_termination_date
  ORDER BY start_date DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'active contract not found'; END IF;
  IF p_termination_date < c.start_date THEN RAISE EXCEPTION 'termination date before contract start'; END IF;

  v_service := age(p_termination_date,c.start_date);
  v_years := extract(year from v_service);
  v_months := extract(month from v_service);
  v_days := extract(day from v_service);

  IF p_termination_cause IN ('161_necesidades_empresa','161_desahucio') AND (v_years > 0 OR v_months > 0 OR v_days > 0) THEN
    v_service_years := v_years + CASE WHEN v_months > 6 OR (v_months = 6 AND v_days > 0) THEN 1 ELSE 0 END;
    v_service_years := least(v_service_years,11);
    IF v_years = 0 AND v_months = 0 THEN v_service_years := 0; END IF;
    v_severance := round(greatest(0,c.salary_amount) * v_service_years,0);
  END IF;

  IF p_termination_cause IN ('161_necesidades_empresa','161_desahucio') AND NOT p_notice_given THEN
    v_notice := round(greatest(0,c.salary_amount),0);
  END IF;

  v_vacation_habiles := round(1.25 * (v_years*12 + v_months + v_days/30.0),4);
  v_target_days := ceil(v_vacation_habiles);
  v_cursor := p_termination_date + 1;
  WHILE v_business_days < v_target_days LOOP
    IF extract(isodow from v_cursor) BETWEEN 1 AND 5 THEN
      v_business_days := v_business_days + 1;
    END IF;
    v_cursor := v_cursor + 1;
  END LOOP;
  v_calendar_days := (v_cursor - (p_termination_date + 1));
  v_vacation := round((greatest(0,c.salary_amount)/30.0) * v_calendar_days,0);
  v_warning := v_warning || jsonb_build_array('Cálculo de feriado proporcional usa calendario lunes-viernes; parametriza festivos para precisión final.');

  v_total := round(v_notice + v_severance + v_vacation,0);

  INSERT INTO public.people_terminations(
    business_id,employee_id,termination_date,termination_cause,notice_pay,severance_years,
    severance_amount,vacation_pay,other_amount,deductions,total_amount,calculation_version,components,created_by
  ) VALUES (
    v_business_id,p_employee_id,p_termination_date,p_termination_cause,v_notice,v_service_years,
    v_severance,v_vacation,0,0,v_total,'cl-finiquito-2026.1',
    jsonb_build_object(
      'salary_base',c.salary_amount,'service_years',v_service_years,
      'service_detail',jsonb_build_object('years',v_years,'months',v_months,'days',v_days),
      'vacation_business_days',v_vacation_habiles,'vacation_calendar_days',v_calendar_days,
      'notice_given',p_notice_given,'warnings',v_warning
    ),auth.uid()
  );

  RETURN jsonb_build_object(
    'employee_id',p_employee_id,'termination_date',p_termination_date,
    'cause',p_termination_cause,'notice_pay',v_notice,'severance_amount',v_severance,
    'vacation_pay',v_vacation,'total_amount',v_total,'warnings',v_warning
  );
END $$;

REVOKE ALL ON FUNCTION public.calculate_people_termination(uuid,date,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_people_termination(uuid,date,text,boolean) TO authenticated;
