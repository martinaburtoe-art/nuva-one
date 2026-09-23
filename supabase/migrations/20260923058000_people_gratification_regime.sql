-- Gratificación: régimen explícito por colaborador y Art. 50 automático.
-- La lógica legal se limita a colaboradores configurados como legal/article_50.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='people_employees_gratification_mode_ck'
      AND conrelid='public.people_employees'::regclass
  ) THEN
    ALTER TABLE public.people_employees
      ADD CONSTRAINT people_employees_gratification_mode_ck
      CHECK (gratification_mode IN ('none','legal','article_50','guaranteed','other'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.calculate_people_annual_gratification(p_employee_id uuid,p_year integer)
RETURNS numeric
LANGUAGE plpgsql STABLE
SET search_path=public
AS $$
DECLARE
  v_mode text; v_business uuid; v_imm numeric; v_total numeric:=0; v_paid numeric:=0;
BEGIN
  SELECT business_id, gratification_mode INTO v_business,v_mode
  FROM public.people_employees WHERE id=p_employee_id;
  IF NOT FOUND OR v_mode NOT IN ('legal','article_50') THEN RETURN 0; END IF;

  SELECT value_numeric INTO v_imm
  FROM public.people_legal_parameters
  WHERE country_code='CL' AND parameter_key='minimum_wage_clp'
    AND effective_from<=make_date(p_year,12,31)
    AND (effective_to IS NULL OR effective_to>=make_date(p_year,1,1))
  ORDER BY effective_from DESC LIMIT 1;

  SELECT coalesce(sum(greatest(0,i.gross_taxable-coalesce((i.components->>'gratification')::numeric,0))),0),
         coalesce(sum(coalesce((i.components->>'gratification')::numeric,0)),0)
    INTO v_total,v_paid
  FROM public.people_payroll_items i
  JOIN public.people_payroll_periods p ON p.id=i.payroll_period_id
  WHERE i.employee_id=p_employee_id AND i.business_id=v_business
    AND p.period_year=p_year AND p.status IN ('calculated','approved','closed');

  RETURN greatest(0,round(least(v_total*0.25,coalesce(v_imm,0)*4.75)-v_paid,0));
END $$;

REVOKE ALL ON FUNCTION public.calculate_people_annual_gratification(uuid,integer)
FROM public,anon,authenticated;

DO $$
DECLARE d text;
BEGIN
  d:=pg_get_functiondef('public.calculate_people_payroll_period(uuid)'::regprocedure);
  d:=replace(d,'v_afp_rate_found boolean;','v_afp_rate_found boolean; v_gratification numeric:=0; v_gratification_paid numeric:=0; v_gratification_cap numeric:=0; v_gratification_base numeric:=0;');
  d:=replace(d,
    'v_taxable:=greatest(0,coalesce(v_period_salary,0)-v_absence_deduction+v_overtime+case when v_input_found then coalesce(v_input.taxable_bonus,0) else coalesce(v_employee.taxable_bonus,0) end+case when v_input_found then coalesce(v_input.gratification_amount,0) else 0 end);',
    'v_gratification_base:=greatest(0,coalesce(v_period_salary,0)-v_absence_deduction+v_overtime+case when v_input_found then coalesce(v_input.taxable_bonus,0) else coalesce(v_employee.taxable_bonus,0) end);
  if coalesce(v_employee.gratification_mode,''none'') in (''legal'',''article_50'') then
    v_gratification:=round(v_gratification_base*0.25,0);
    if v_period.period_month=12 then
      select coalesce(sum(coalesce((i.components->>''gratification'')::numeric,0)),0) into v_gratification_paid
      from public.people_payroll_items i join public.people_payroll_periods pp on pp.id=i.payroll_period_id
      where i.employee_id=v_employee.id and i.business_id=v_period.business_id and pp.period_year=v_period.period_year
        and pp.period_month<12 and pp.status in (''calculated'',''approved'',''closed'');
      select coalesce(value_numeric,0)*4.75 into v_gratification_cap
      from public.people_legal_parameters
      where country_code=''CL'' and parameter_key=''minimum_wage_clp''
        and effective_from<=v_period_end and (effective_to is null or effective_to>=v_period_start)
      order by effective_from desc limit 1;
      v_gratification:=greatest(0,least(v_gratification,v_gratification_cap-v_gratification_paid));
    end if;
  elsif v_input_found and coalesce(v_employee.gratification_mode,''none'') in (''guaranteed'',''other'') then
    v_gratification:=coalesce(v_input.gratification_amount,0);
  end if;
  v_taxable:=greatest(0,v_gratification_base+v_gratification);');
  d:=replace(d,'case when v_input_found then v_input.gratification_amount else 0 end,''afp_employee''','v_gratification,''afp_employee''');
  d:=replace(d,'''cl-2026.11''','''cl-2026.12''');
  EXECUTE d;
END $$;
