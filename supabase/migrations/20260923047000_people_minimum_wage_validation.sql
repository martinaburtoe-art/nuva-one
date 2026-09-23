-- Nüva People — validación IMM según jornada y período parcial.
-- Chile: jornada <=30h permite IMM proporcional; jornada intermedia exige IMM íntegro.
create or replace function public.validate_people_payroll_period(p_payroll_period_id uuid)
returns jsonb
language plpgsql
set search_path = public, private
as $function$
DECLARE
 p record; i record; e record; c record;
 warnings jsonb; total integer:=0; invalid integer:=0;
 min_wage numeric; expected_min_wage numeric;
 period_start date; period_end date; active_start date; active_end date;
BEGIN
 SELECT * INTO p FROM public.people_payroll_periods WHERE id=p_payroll_period_id;
 IF NOT FOUND OR NOT private.has_business_role(p.business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]) THEN
   RAISE EXCEPTION 'period not accessible';
 END IF;
 period_start:=make_date(p.period_year,p.period_month,1);
 period_end:=(period_start+interval '1 month - 1 day')::date;
 SELECT value_numeric INTO min_wage
 FROM public.people_legal_parameters
 WHERE country_code='CL' AND parameter_key='minimum_monthly_wage'
   AND effective_from<=period_start AND (effective_to IS NULL OR effective_to>=period_start)
 ORDER BY effective_from DESC LIMIT 1;
 FOR i IN SELECT * FROM public.people_payroll_items WHERE payroll_period_id=p_payroll_period_id LOOP
   SELECT * INTO e FROM public.people_employees WHERE id=i.employee_id;
   warnings:='[]'::jsonb;
   IF NULLIF(btrim(e.national_id),'') IS NULL THEN
     warnings:=warnings||jsonb_build_array('RUT faltante');
   END IF;
   SELECT * INTO c
   FROM public.people_contracts
   WHERE id=(SELECT id FROM public.people_contracts
             WHERE employee_id=i.employee_id AND business_id=p.business_id AND status='active'
               AND start_date<=period_end AND (end_date IS NULL OR end_date>=period_start)
             ORDER BY start_date DESC LIMIT 1);
   IF min_wage IS NOT NULL AND FOUND THEN
     active_start:=greatest(period_start,c.start_date);
     active_end:=least(period_end,coalesce(c.end_date,period_end));
     expected_min_wage:=min_wage * CASE
       WHEN coalesce(c.weekly_hours,42)<=30 THEN coalesce(c.weekly_hours,42)/42.0
       ELSE 1
     END;
     IF active_start>period_start OR active_end<period_end THEN
       expected_min_wage:=expected_min_wage*greatest(0,(active_end-active_start+1))/30.0;
     END IF;
     IF i.gross_taxable < round(expected_min_wage,0) THEN
       warnings:=warnings||jsonb_build_array('Remuneración imponible bajo IMM aplicable; revisar jornada y período');
     END IF;
   END IF;
   IF jsonb_array_length(i.warnings)>0 THEN warnings:=warnings||i.warnings; END IF;
   total:=total+1;
   IF jsonb_array_length(warnings)>0 THEN invalid:=invalid+1; END IF;
 END LOOP;
 RETURN jsonb_build_object('period_id',p_payroll_period_id,'total',total,'invalid',invalid,'valid',total-invalid);
END $function$;