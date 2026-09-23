-- Annual legal gratification helper (Art. 50).
-- Uses 25% of remuneration accrued during the year, excludes already-paid
-- gratification from the base, applies the 4.75 IMM cap, and returns the
-- remaining amount to settle. Company eligibility/profitability remains a
-- business/legal configuration decision and is intentionally not inferred.
CREATE OR REPLACE FUNCTION public.calculate_people_annual_gratification(p_employee_id uuid,p_year integer)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE v_business uuid; v_total numeric:=0; v_paid numeric:=0; v_imm numeric; v_cap numeric;
BEGIN
 SELECT business_id INTO v_business FROM public.people_employees WHERE id=p_employee_id;
 IF v_business IS NULL THEN RETURN 0; END IF;
 SELECT value_numeric INTO v_imm FROM public.people_legal_parameters WHERE parameter_key='minimum_wage'
   AND effective_from<=make_date(p_year,12,31) AND (effective_to IS NULL OR effective_to>=make_date(p_year,1,1))
   ORDER BY effective_from DESC LIMIT 1;
 SELECT COALESCE(sum(gross_taxable-COALESCE((components->>'gratification')::numeric,0)),0),
        COALESCE(sum(COALESCE((components->>'gratification')::numeric,0))
        ,0) INTO v_total,v_paid
 FROM public.people_payroll_items i JOIN public.people_payroll_periods p ON p.id=i.payroll_period_id
 WHERE i.employee_id=p_employee_id AND i.business_id=v_business AND p.period_year=p_year
   AND p.status IN ('calculated','approved','closed');
 IF v_imm IS NULL THEN RETURN 0; END IF;
 v_cap:=v_imm*4.75;
 RETURN greatest(0,round(least(v_total*0.25,v_cap)-v_paid,0));
END $$;
REVOKE ALL ON FUNCTION public.calculate_people_annual_gratification(uuid,integer) FROM PUBLIC,anon,authenticated;