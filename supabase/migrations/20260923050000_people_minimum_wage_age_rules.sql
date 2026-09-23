-- Nüva People — IMM 2026 por tramo etario.
-- Desde 2026-05-01: $553.553 para mayores de 18 y hasta 65; $412.938 para menores de 18 y mayores de 65.
INSERT INTO public.people_legal_parameters
  (country_code, parameter_key, effective_from, effective_to, value_numeric, source_url, source_reference, notes)
VALUES
  ('CL','minimum_monthly_wage_under18_over65','2026-05-01',NULL,412938,
   'https://www.dt.gob.cl/portal/1628/w3-article-60141.html',
   'Ley 21.830 / ORD. N°307/28',
   'IMM para menores de 18 y mayores de 65 desde 2026-05-01')
ON CONFLICT (country_code, parameter_key, effective_from)
DO UPDATE SET effective_to=excluded.effective_to,value_numeric=excluded.value_numeric,
  source_url=excluded.source_url,source_reference=excluded.source_reference,notes=excluded.notes;

CREATE OR REPLACE FUNCTION public.validate_people_payroll_period(p_payroll_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public','private' AS $function$
DECLARE p record; i record; e record; c record; warnings jsonb; total integer:=0; invalid integer:=0; min_wage numeric; expected_min_wage numeric; period_start date; period_end date; active_start date; active_end date; employee_age integer; min_wage_key text;
BEGIN
 SELECT * INTO p FROM public.people_payroll_periods WHERE id=p_payroll_period_id;
 IF NOT FOUND OR NOT private.has_business_role(p.business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]) THEN RAISE EXCEPTION 'period not accessible'; END IF;
 period_start:=make_date(p.period_year,p.period_month,1); period_end:=(period_start+interval '1 month - 1 day')::date;
 FOR i IN SELECT * FROM public.people_payroll_items WHERE payroll_period_id=p_payroll_period_id LOOP
   SELECT * INTO e FROM public.people_employees WHERE id=i.employee_id;
   warnings:='[]'::jsonb;
   IF NULLIF(btrim(e.national_id),'') IS NULL THEN warnings:=warnings||jsonb_build_array('RUT faltante'); END IF;
   employee_age:=CASE WHEN e.birth_date IS NULL THEN NULL ELSE extract(year from age(period_end,e.birth_date))::integer END;
   min_wage_key:=CASE WHEN employee_age IS NOT NULL AND (employee_age<18 OR employee_age>65) THEN 'minimum_monthly_wage_under18_over65' ELSE 'minimum_monthly_wage_18_65' END;
   SELECT value_numeric INTO min_wage FROM public.people_legal_parameters WHERE country_code='CL' AND parameter_key=min_wage_key AND effective_from<=period_start AND (effective_to IS NULL OR effective_to>=period_start) ORDER BY effective_from DESC LIMIT 1;
   IF min_wage IS NULL THEN SELECT value_numeric INTO min_wage FROM public.people_legal_parameters WHERE country_code='CL' AND parameter_key='minimum_monthly_wage' AND effective_from<=period_start AND (effective_to IS NULL OR effective_to>=period_start) ORDER BY effective_from DESC LIMIT 1; END IF;
   SELECT * INTO c FROM public.people_contracts WHERE id=(SELECT id FROM public.people_contracts WHERE employee_id=i.employee_id AND business_id=p.business_id AND status='active' AND start_date<=period_end AND (end_date IS NULL OR end_date>=period_start) ORDER BY start_date DESC LIMIT 1);
   IF min_wage IS NOT NULL AND FOUND THEN
     active_start:=greatest(period_start,c.start_date); active_end:=least(period_end,coalesce(c.end_date,period_end));
     expected_min_wage:=min_wage * CASE WHEN coalesce(c.weekly_hours,42)<=30 THEN coalesce(c.weekly_hours,42)/42.0 ELSE 1 END;
     IF active_start>period_start OR active_end<period_end THEN expected_min_wage:=expected_min_wage*greatest(0,(active_end-active_start+1))/30.0; END IF;
     IF i.gross_taxable < round(expected_min_wage,0) THEN warnings:=warnings||jsonb_build_array('Remuneración imponible bajo IMM aplicable; revisar edad, jornada y período'); END IF;
   END IF;
   IF jsonb_array_length(i.warnings)>0 THEN warnings:=warnings||i.warnings; END IF;
   total:=total+1; IF jsonb_array_length(warnings)>0 THEN invalid:=invalid+1; END IF;
 END LOOP;
 RETURN jsonb_build_object('period_id',p_payroll_period_id,'total',total,'invalid',invalid,'valid',total-invalid);
END $function$;
