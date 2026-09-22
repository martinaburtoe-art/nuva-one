CREATE OR REPLACE FUNCTION public.validate_people_payroll_period(p_payroll_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,private AS $$
DECLARE p record; i record; e record; warnings jsonb; total integer:=0; invalid integer:=0; min_wage numeric;
BEGIN
 SELECT * INTO p FROM public.people_payroll_periods WHERE id=p_payroll_period_id;
 IF NOT FOUND OR NOT private.has_business_role(p.business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]) THEN RAISE EXCEPTION 'period not accessible'; END IF;
 SELECT value_numeric INTO min_wage FROM public.people_legal_parameters WHERE country_code='CL' AND parameter_key='minimum_monthly_wage'
   AND effective_from<=make_date(p.period_year,p.period_month,1) AND (effective_to IS NULL OR effective_to>=make_date(p.period_year,p.period_month,1))
 ORDER BY effective_from DESC LIMIT 1;
 FOR i IN SELECT * FROM public.people_payroll_items WHERE payroll_period_id=p_payroll_period_id LOOP
   SELECT * INTO e FROM public.people_employees WHERE id=i.employee_id;
   warnings:='[]'::jsonb;
   IF NULLIF(btrim(e.national_id),'') IS NULL THEN warnings:=warnings||jsonb_build_array('RUT faltante'); END IF;
   IF min_wage IS NOT NULL AND i.gross_taxable < min_wage THEN warnings:=warnings||jsonb_build_array('Remuneración imponible bajo IMM vigente; revisar jornada/causal'); END IF;
   IF jsonb_array_length(i.warnings)>0 THEN warnings:=warnings||i.warnings; END IF;
   total:=total+1; IF jsonb_array_length(warnings)>0 THEN invalid:=invalid+1; END IF;
 END LOOP;
 RETURN jsonb_build_object('period_id',p_payroll_period_id,'total',total,'invalid',invalid,'valid',total-invalid);
END $$;

-- Replace the approval guard so legal validation is part of the state transition.
CREATE OR REPLACE FUNCTION public.approve_people_payroll_period(p_payroll_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,private AS $$
DECLARE p record; invalid_count integer; validation jsonb;
BEGIN
 SELECT * INTO p FROM public.people_payroll_periods WHERE id=p_payroll_period_id;
 IF NOT FOUND OR NOT private.has_business_role(p.business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]) THEN RAISE EXCEPTION 'period not accessible'; END IF;
 IF p.status<>'calculated' THEN RAISE EXCEPTION 'only calculated periods can be approved'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.people_payroll_items WHERE payroll_period_id=p_payroll_period_id) THEN RAISE EXCEPTION 'period has no payroll items'; END IF;
 validation:=public.validate_people_payroll_period(p_payroll_period_id);
 invalid_count:=COALESCE((validation->>'invalid')::integer,0);
 IF invalid_count>0 THEN RAISE EXCEPTION 'payroll validation failed: % invalid items',invalid_count; END IF;
 UPDATE public.people_payroll_periods SET status='approved',approved_at=now(),approved_by=auth.uid() WHERE id=p_payroll_period_id;
 RETURN jsonb_build_object('period_id',p_payroll_period_id,'status','approved','validation',validation);
END $$;
GRANT EXECUTE ON FUNCTION public.validate_people_payroll_period(uuid) TO authenticated;