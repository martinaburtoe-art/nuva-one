-- Cierre integral de gratificación legal: régimen empresarial, IPC y liquidación anual Art. 47/50.
-- La liquidación Art. 50 exige factores IPC completos; nunca aproxima silenciosamente.
CREATE TABLE IF NOT EXISTS public.people_gratification_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100), scheme text NOT NULL CHECK (scheme IN ('none','article_47','article_50','contractual')),
 liquid_profit numeric(18,2) CHECK (liquid_profit IS NULL OR liquid_profit >= 0), effective_from date NOT NULL, effective_to date NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','closed')), notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(business_id,fiscal_year), CHECK(effective_to>=effective_from), CHECK(scheme<>'article_47' OR liquid_profit IS NOT NULL)
);
ALTER TABLE public.people_gratification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY people_gratification_settings_select ON public.people_gratification_settings FOR SELECT USING(private.is_business_member(business_id,(select auth.uid())));
CREATE POLICY people_gratification_settings_write ON public.people_gratification_settings FOR INSERT WITH CHECK(private.has_business_role(business_id,(select auth.uid()),ARRAY['owner'::member_role,'admin'::member_role]));
CREATE POLICY people_gratification_settings_update ON public.people_gratification_settings FOR UPDATE USING(private.has_business_role(business_id,(select auth.uid()),ARRAY['owner'::member_role,'admin'::member_role])) WITH CHECK(private.has_business_role(business_id,(select auth.uid()),ARRAY['owner'::member_role,'admin'::member_role]));
CREATE POLICY people_gratification_settings_delete ON public.people_gratification_settings FOR DELETE USING(private.has_business_role(business_id,(select auth.uid()),ARRAY['owner'::member_role,'admin'::member_role]));

CREATE TABLE IF NOT EXISTS public.people_gratification_ipc (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE, fiscal_year integer NOT NULL CHECK(fiscal_year BETWEEN 2000 AND 2100),
 month integer NOT NULL CHECK(month BETWEEN 1 AND 12), index_value numeric(18,8) NOT NULL CHECK(index_value>0), source_url text, source_reference text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(business_id,fiscal_year,month)
);
ALTER TABLE public.people_gratification_ipc ENABLE ROW LEVEL SECURITY;
CREATE POLICY people_gratification_ipc_select ON public.people_gratification_ipc FOR SELECT USING(business_id IS NULL OR private.is_business_member(business_id,(select auth.uid())));
CREATE POLICY people_gratification_ipc_write ON public.people_gratification_ipc FOR INSERT WITH CHECK(business_id IS NULL OR private.has_business_role(business_id,(select auth.uid()),ARRAY['owner'::member_role,'admin'::member_role]));
CREATE POLICY people_gratification_ipc_update ON public.people_gratification_ipc FOR UPDATE USING(business_id IS NULL OR private.has_business_role(business_id,(select auth.uid()),ARRAY['owner'::member_role,'admin'::member_role])) WITH CHECK(business_id IS NULL OR private.has_business_role(business_id,(select auth.uid()),ARRAY['owner'::member_role,'admin'::member_role]));

CREATE TABLE IF NOT EXISTS public.people_gratification_settlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE, employee_id uuid NOT NULL REFERENCES public.people_employees(id) ON DELETE CASCADE,
 fiscal_year integer NOT NULL CHECK(fiscal_year BETWEEN 2000 AND 2100), scheme text NOT NULL CHECK(scheme IN ('article_47','article_50','contractual')),
 legal_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK(legal_amount>=0), advances_revalued numeric(18,2) NOT NULL DEFAULT 0 CHECK(advances_revalued>=0), balance_due numeric(18,2) NOT NULL DEFAULT 0 CHECK(balance_due>=0), balance_credit numeric(18,2) NOT NULL DEFAULT 0 CHECK(balance_credit>=0), cap_amount numeric(18,2),
 calculation_payload jsonb NOT NULL DEFAULT '{}'::jsonb, status text NOT NULL DEFAULT 'calculated' CHECK(status IN ('calculated','approved','paid')), calculated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(business_id,employee_id,fiscal_year)
);
ALTER TABLE public.people_gratification_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY people_gratification_settlements_select ON public.people_gratification_settlements FOR SELECT USING(private.is_business_member(business_id,(select auth.uid())));
CREATE POLICY people_gratification_settlements_write ON public.people_gratification_settlements FOR INSERT WITH CHECK(private.has_business_role(business_id,(select auth.uid()),ARRAY['owner'::member_role,'admin'::member_role]));
CREATE POLICY people_gratification_settlements_update ON public.people_gratification_settlements FOR UPDATE USING(private.has_business_role(business_id,(select auth.uid()),ARRAY['owner'::member_role,'admin'::member_role])) WITH CHECK(private.has_business_role(business_id,(select auth.uid()),ARRAY['owner'::member_role,'admin'::member_role]));

CREATE OR REPLACE FUNCTION public.calculate_people_gratification_settlement(p_employee_id uuid,p_year integer)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE v_business uuid; v_mode text; v_scheme text; v_profit numeric; v_total_rem numeric:=0; v_employee_rem numeric:=0; v_legal numeric:=0; v_revalued numeric:=0; v_cap numeric:=0; v_missing integer:=0; r record;
BEGIN
 SELECT business_id,gratification_mode INTO v_business,v_mode FROM people_employees WHERE id=p_employee_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Empleado no existe'; END IF;
 SELECT scheme,liquid_profit INTO v_scheme,v_profit FROM people_gratification_settings WHERE business_id=v_business AND fiscal_year=p_year AND status IN ('approved','closed');
 IF NOT FOUND OR v_scheme='none' THEN RETURN 0; END IF;
 SELECT coalesce(sum(greatest(0,i.gross_taxable-coalesce((i.components->>'gratification')::numeric,0))),0) INTO v_employee_rem
 FROM people_payroll_items i JOIN people_payroll_periods p ON p.id=i.payroll_period_id
 WHERE i.employee_id=p_employee_id AND p.business_id=v_business AND p.period_year=p_year AND p.status IN ('calculated','approved','closed');
 IF v_scheme='article_50' THEN
   SELECT count(*) INTO v_missing FROM people_payroll_items i JOIN people_payroll_periods p ON p.id=i.payroll_period_id
   WHERE i.employee_id=p_employee_id AND p.business_id=v_business AND p.period_year=p_year AND p.status IN ('calculated','approved','closed')
   AND NOT EXISTS(SELECT 1 FROM people_gratification_ipc x WHERE (x.business_id=v_business OR x.business_id IS NULL) AND x.fiscal_year=p_year AND x.month=p.period_month);
   IF v_missing>0 THEN RAISE EXCEPTION 'Faltan factores IPC para cerrar gratificación Art. 50 del ejercicio %',p_year; END IF;
   FOR r IN SELECT p.period_month,coalesce((i.components->>'gratification')::numeric,0) gratification FROM people_payroll_items i JOIN people_payroll_periods p ON p.id=i.payroll_period_id
   WHERE i.employee_id=p_employee_id AND p.business_id=v_business AND p.period_year=p_year AND p.status IN ('calculated','approved','closed')
   LOOP
     v_revalued:=v_revalued+r.gratification*((SELECT index_value FROM people_gratification_ipc WHERE (business_id=v_business OR business_id IS NULL) AND fiscal_year=p_year AND month=12 ORDER BY business_id NULLS LAST LIMIT 1)/(SELECT index_value FROM people_gratification_ipc WHERE (business_id=v_business OR business_id IS NULL) AND fiscal_year=p_year AND month=r.period_month ORDER BY business_id NULLS LAST LIMIT 1));
   END LOOP;
   SELECT value_numeric*4.75 INTO v_cap FROM people_legal_parameters WHERE country_code='CL' AND parameter_key='minimum_monthly_wage' AND effective_from<=make_date(p_year,12,31) AND (effective_to IS NULL OR effective_to>=make_date(p_year,12,31)) ORDER BY effective_from DESC LIMIT 1;
   v_legal:=least(v_employee_rem*0.25,v_cap);
 ELSIF v_scheme='article_47' THEN
   SELECT coalesce(sum(greatest(0,i.gross_taxable-coalesce((i.components->>'gratification')::numeric,0))),0) INTO v_total_rem
   FROM people_payroll_items i JOIN people_payroll_periods p ON p.id=i.payroll_period_id JOIN people_employees e ON e.id=i.employee_id
   WHERE i.business_id=v_business AND p.period_year=p_year AND p.status IN ('calculated','approved','closed') AND e.gratification_mode<>'none';
   v_legal:=CASE WHEN v_total_rem>0 THEN greatest(0,v_profit*0.30*(v_employee_rem/v_total_rem)) ELSE 0 END;
 ELSE v_legal:=v_employee_rem*0.25; END IF;
 v_legal:=round(greatest(0,v_legal),0); v_revalued:=round(greatest(0,v_revalued),0);
 INSERT INTO people_gratification_settlements(business_id,employee_id,fiscal_year,scheme,legal_amount,advances_revalued,balance_due,balance_credit,cap_amount,calculation_payload)
 VALUES(v_business,p_employee_id,p_year,v_scheme,v_legal,v_revalued,greatest(0,v_legal-v_revalued),greatest(0,v_revalued-v_legal),v_cap,jsonb_build_object('employee_remuneration',v_employee_rem,'profit',v_profit,'ipc_revaluation',v_revalued,'generated_at',now()))
 ON CONFLICT(business_id,employee_id,fiscal_year) DO UPDATE SET legal_amount=excluded.legal_amount,advances_revalued=excluded.advances_revalued,balance_due=excluded.balance_due,balance_credit=excluded.balance_credit,cap_amount=excluded.cap_amount,calculation_payload=excluded.calculation_payload,calculated_at=now(),status='calculated';
 RETURN greatest(0,v_legal-v_revalued);
END $$;
REVOKE ALL ON FUNCTION public.calculate_people_gratification_settlement(uuid,integer) FROM public,anon,authenticated;
CREATE INDEX IF NOT EXISTS idx_people_gratification_settings_business_year ON public.people_gratification_settings(business_id,fiscal_year);
CREATE INDEX IF NOT EXISTS idx_people_gratification_ipc_year_month ON public.people_gratification_ipc(fiscal_year,month);
CREATE INDEX IF NOT EXISTS idx_people_gratification_settlements_business_year ON public.people_gratification_settlements(business_id,fiscal_year);