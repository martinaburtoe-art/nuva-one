-- Nüva People — Chile payroll calculation engine (gated, auditable)
-- Calculates a monthly draft from versioned parameters. Production closure remains explicit.

ALTER TABLE public.people_employees
  ADD COLUMN IF NOT EXISTS pension_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS overtime_hours numeric(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_bonus numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS non_taxable_bonus numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_deductions numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gratification_mode text NOT NULL DEFAULT 'none';

CREATE TABLE IF NOT EXISTS public.people_payroll_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payroll_period_id uuid NOT NULL REFERENCES public.people_payroll_periods(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.people_employees(id) ON DELETE CASCADE,
  overtime_hours numeric(8,2) NOT NULL DEFAULT 0,
  taxable_bonus numeric(14,2) NOT NULL DEFAULT 0,
  non_taxable_bonus numeric(14,2) NOT NULL DEFAULT 0,
  absences_days numeric(6,2) NOT NULL DEFAULT 0,
  other_deductions numeric(14,2) NOT NULL DEFAULT 0,
  advance_payment numeric(14,2) NOT NULL DEFAULT 0,
  gratification_amount numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(payroll_period_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_people_payroll_inputs_period ON public.people_payroll_inputs(payroll_period_id);

ALTER TABLE public.people_payroll_inputs ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.people_payroll_inputs TO authenticated;
DROP POLICY IF EXISTS people_payroll_inputs_select ON public.people_payroll_inputs;
DROP POLICY IF EXISTS people_payroll_inputs_write ON public.people_payroll_inputs;
CREATE POLICY people_payroll_inputs_select ON public.people_payroll_inputs
  FOR SELECT USING (private.is_business_member(business_id,auth.uid()));
CREATE POLICY people_payroll_inputs_write ON public.people_payroll_inputs
  FOR ALL USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]))
  WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));

INSERT INTO public.people_legal_parameters(country_code,parameter_key,value_numeric,effective_from,source_url,source_reference,notes) VALUES
('CL','pension_income_cap_uf',90,'2026-02-01','https://www.spensiones.cl/portal/institucional/594/w3-article-16921.html','SP — tope imponible 2026','Tope mensual AFP/salud/accidentes: 90 UF'),
('CL','unemployment_income_cap_uf',135.2,'2026-02-01','https://www.spensiones.cl/portal/institucional/594/w3-article-16921.html','SP — tope imponible 2026','Tope mensual seguro de cesantía: 135,2 UF'),
('CL','sis_rate',0.0162,'2026-04-01','https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9917.html','SP — SIS vigente abril 2026','Cargo empleador para dependientes'),
('CL','ssp_protected_return_rate',0.009,'2026-08-01','https://www71.spensiones.cl/portal/institucional/594/w3-article-16981.html','SP NCG 361','Cotización con rentabilidad protegida, cargo empleador'),
('CL','health_rate',0.07,'2026-01-01','https://www.superdesalud.gob.cl/tax-temas-de-orientacion/exceso-de-cotizacion-4015/','Superintendencia de Salud','Cotización legal de salud'),
('CL','overtime_surcharge',0.50,'2026-01-01','https://www.dt.gob.cl/portal/1628/w3-article-60191.html','Dirección del Trabajo, art. 32','Recargo legal mínimo de horas extraordinarias'),
('CL','uf_value_clp',41057.20,'2026-09-30','https://www.sii.cl/valores_y_fechas/uf/uf2026.htm','SII — UF 30 septiembre 2026','Valor diario; el período debe snapshotear el valor aplicable antes del cierre')
ON CONFLICT (country_code,parameter_key,effective_from) DO UPDATE SET value_numeric=EXCLUDED.value_numeric,source_url=EXCLUDED.source_url,source_reference=EXCLUDED.source_reference,notes=EXCLUDED.notes;

CREATE OR REPLACE FUNCTION public.calculate_people_payroll_period(p_payroll_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_period public.people_payroll_periods%ROWTYPE;
  v_user uuid := auth.uid();
  v_param jsonb := '{}'::jsonb;
  v_uf numeric;
  v_pension_cap numeric;
  v_unemployment_cap numeric;
  v_sis numeric;
  v_ssp numeric;
  v_health numeric;
  v_ot numeric;
  v_employee record;
  v_contract record;
  v_input record;
  v_taxable numeric;
  v_non_taxable numeric;
  v_pension_base numeric;
  v_unemployment_base numeric;
  v_afp_commission numeric := 0;
  v_afp_employee numeric := 0;
  v_health_deduction numeric := 0;
  v_afc_employee numeric := 0;
  v_afc_employer numeric := 0;
  v_sis_amount numeric := 0;
  v_ssp_amount numeric := 0;
  v_overtime numeric := 0;
  v_income_tax numeric := 0;
  v_deductions numeric := 0;
  v_net numeric := 0;
  v_employer_cost numeric := 0;
  v_hourly numeric := 0;
  v_warnings jsonb := '[]'::jsonb;
  v_components jsonb;
  v_bracket record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

  SELECT * INTO v_period FROM public.people_payroll_periods WHERE id = p_payroll_period_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'payroll period not found'; END IF;
  IF NOT private.has_business_role(v_period.business_id,v_user,ARRAY['owner','admin']::public.member_role[]) THEN
    RAISE EXCEPTION 'owner/admin role required';
  END IF;
  IF v_period.status IN ('approved','closed','void') THEN
    RAISE EXCEPTION 'payroll period is immutable in status %', v_period.status;
  END IF;

  SELECT COALESCE(jsonb_object_agg(parameter_key,COALESCE(to_jsonb(value_numeric),to_jsonb(value_text))),'{}'::jsonb)
  INTO v_param
  FROM public.people_legal_parameters
  WHERE country_code='CL' AND effective_from <= make_date(v_period.period_year,v_period.period_month,1)
    AND (effective_to IS NULL OR effective_to >= make_date(v_period.period_year,v_period.period_month,1));

  v_uf := NULLIF(v_param->>'uf_value_clp','')::numeric;
  v_pension_cap := NULLIF(v_param->>'pension_income_cap_uf','')::numeric * v_uf;
  v_unemployment_cap := NULLIF(v_param->>'unemployment_income_cap_uf','')::numeric * v_uf;
  v_sis := COALESCE(NULLIF(v_param->>'sis_rate','')::numeric,0.0162);
  v_ssp := CASE WHEN make_date(v_period.period_year,v_period.period_month,1) >= DATE '2026-08-01'
                THEN COALESCE(NULLIF(v_param->>'ssp_protected_return_rate','')::numeric,0.009) ELSE 0 END;
  v_health := COALESCE(NULLIF(v_param->>'health_rate','')::numeric,0.07);
  v_ot := COALESCE(NULLIF(v_param->>'overtime_surcharge','')::numeric,0.50);

  IF v_uf IS NULL OR v_pension_cap IS NULL OR v_unemployment_cap IS NULL THEN
    RAISE EXCEPTION 'missing UF/tope legal parameter for payroll period %/%',v_period.period_year,v_period.period_month;
  END IF;

  DELETE FROM public.people_payroll_items WHERE payroll_period_id=p_payroll_period_id;

  FOR v_employee IN
    SELECT e.* FROM public.people_employees e
    WHERE e.business_id=v_period.business_id AND e.employment_status='active'
  LOOP
    SELECT c.* INTO v_contract
    FROM public.people_contracts c
    WHERE c.employee_id=v_employee.id AND c.business_id=v_period.business_id
      AND c.status='active' AND c.start_date <= make_date(v_period.period_year,v_period.period_month,28)
      AND (c.end_date IS NULL OR c.end_date >= make_date(v_period.period_year,v_period.period_month,1))
    ORDER BY c.start_date DESC LIMIT 1;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_input FROM public.people_payroll_inputs
    WHERE payroll_period_id=p_payroll_period_id AND employee_id=v_employee.id;

    v_input.overtime_hours := COALESCE(v_input.overtime_hours,v_employee.overtime_hours,0);
    v_input.taxable_bonus := COALESCE(v_input.taxable_bonus,v_employee.taxable_bonus,0);
    v_input.non_taxable_bonus := COALESCE(v_input.non_taxable_bonus,v_employee.non_taxable_bonus,0);
    v_input.other_deductions := COALESCE(v_input.other_deductions,v_employee.other_deductions,0);
    v_input.gratification_amount := COALESCE(v_input.gratification_amount,0);

    v_hourly := CASE WHEN COALESCE(v_contract.weekly_hours,42) > 0
      THEN (v_contract.salary_amount / 30 * 28 / (v_contract.weekly_hours * 4)) ELSE 0 END;
    v_overtime := round(v_hourly * (1 + v_ot) * v_input.overtime_hours,0);

    v_taxable := greatest(0,COALESCE(v_contract.salary_amount,0) + v_overtime + v_input.taxable_bonus + v_input.gratification_amount);
    v_non_taxable := greatest(0,v_input.non_taxable_bonus);
    v_pension_base := least(v_taxable,v_pension_cap);
    v_unemployment_base := least(v_taxable,v_unemployment_cap);

    SELECT COALESCE(worker_commission,0) INTO v_afp_commission
    FROM public.people_afp_rates
    WHERE country_code='CL' AND afp_name=COALESCE(v_employee.afp_name,'')
      AND effective_from <= make_date(v_period.period_year,v_period.period_month,1)
      AND (effective_to IS NULL OR effective_to >= make_date(v_period.period_year,v_period.period_month,1))
    ORDER BY effective_from DESC LIMIT 1;

    v_afp_employee := CASE WHEN COALESCE(v_employee.pension_status,'active')='active'
      THEN round(v_pension_base * (0.10 + COALESCE(v_afp_commission,0)),0) ELSE 0 END;

    IF lower(COALESCE(v_employee.health_system,'fonasa'))='isapre' THEN
      IF COALESCE(v_employee.health_plan_uf,0) > 0 THEN
        v_health_deduction := greatest(round(v_pension_base*v_health,0),
          round(v_employee.health_plan_uf*v_uf + COALESCE(v_employee.health_additional_clp,0),0));
      ELSE
        v_health_deduction := round(v_pension_base*v_health,0);
        v_warnings := v_warnings || jsonb_build_array('Isapre sin plan UF configurado; se aplicó 7% legal');
      END IF;
    ELSE
      v_health_deduction := round(v_pension_base*v_health,0);
    END IF;

    IF lower(COALESCE(v_contract.contract_type,v_employee.employment_type))='indefinite' THEN
      v_afc_employee := round(v_unemployment_base*0.006,0);
      v_afc_employer := round(v_unemployment_base*0.024,0);
    ELSE
      v_afc_employee := 0;
      v_afc_employer := round(v_unemployment_base*0.03,0);
    END IF;

    v_sis_amount := round(v_pension_base*v_sis,0);
    v_ssp_amount := round(v_pension_base*v_ssp,0);

    SELECT b.* INTO v_bracket
    FROM public.people_tax_brackets b
    WHERE b.country_code='CL' AND b.tax_type='IUSC'
      AND b.period_year=v_period.period_year AND b.period_month=v_period.period_month
      AND v_taxable - v_afp_employee - v_health_deduction - v_afc_employee >= b.min_income
      AND (b.max_income IS NULL OR v_taxable - v_afp_employee - v_health_deduction - v_afc_employee <= b.max_income)
    ORDER BY b.min_income DESC LIMIT 1;

    v_income_tax := CASE WHEN FOUND
      THEN greatest(0,round((v_taxable-v_afp_employee-v_health_deduction-v_afc_employee)*v_bracket.factor-v_bracket.rebate,0))
      ELSE 0 END;

    IF NOT FOUND THEN
      v_warnings := v_warnings || jsonb_build_array('Tabla IUSC no cargada para el período');
    END IF;

    v_deductions := v_afp_employee + v_health_deduction + v_afc_employee + v_income_tax + COALESCE(v_input.other_deductions,0) + COALESCE(v_input.advance_payment,0);
    v_net := greatest(0,round(v_taxable+v_non_taxable-v_deductions,0));
    v_employer_cost := round(v_taxable + v_afc_employer + v_sis_amount + v_ssp_amount,0);

    v_components := jsonb_build_object(
      'salary',v_contract.salary_amount,'overtime',v_overtime,'taxable_bonus',v_input.taxable_bonus,
      'non_taxable_bonus',v_non_taxable,'gratification',v_input.gratification_amount,
      'afp_employee',v_afp_employee,'health',v_health_deduction,'afc_employee',v_afc_employee,
      'afc_employer',v_afc_employer,'sis_employer',v_sis_amount,'ssp_employer',v_ssp_amount,
      'pension_base',v_pension_base,'unemployment_base',v_unemployment_base,'uf_value',v_uf,
      'pension_cap',v_pension_cap,'unemployment_cap',v_unemployment_cap
    );

    INSERT INTO public.people_payroll_items(
      business_id,payroll_period_id,employee_id,gross_taxable,gross_non_taxable,deductions,employer_cost_amount,
      net_pay,overtime_amount,vacation_amount,income_tax,social_security,components,warnings,calculation_version,parameter_snapshot
    ) VALUES (
      v_period.business_id,p_payroll_period_id,v_employee.id,v_taxable,v_non_taxable,v_deductions,v_employer_cost,
      v_net,v_overtime,0,v_income_tax,v_afp_employee+v_health_deduction+v_afc_employee+v_sis_amount+v_ssp_amount,
      v_components,v_warnings,'cl-2026.2',v_param
    );
  END LOOP;

  UPDATE public.people_payroll_periods
  SET status='calculated',calculated_at=now(),calculation_version='cl-2026.2',parameter_snapshot=v_param
  WHERE id=p_payroll_period_id;

  RETURN jsonb_build_object('period_id',p_payroll_period_id,'status','calculated',
    'items',(SELECT count(*) FROM public.people_payroll_items WHERE payroll_period_id=p_payroll_period_id),
    'parameter_snapshot',v_param);
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_people_payroll_period(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_people_payroll_period(uuid) TO authenticated;
