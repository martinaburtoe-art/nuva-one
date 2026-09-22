-- Nüva People — payroll completion pass 2026.09
-- Legal correction + lifecycle foundations: overtime, vacation, termination, liquidation, LRE.

INSERT INTO public.people_legal_parameters(country_code,parameter_key,value_numeric,effective_from,source_url,source_reference,notes) VALUES
('CL','sis_rate',0.0154,'2026-01-01','https://www.spensiones.cl/inf_estadistica/iftafp/2026/03/NE-prv202603.pdf','SP — SIS vigente enero 2026','Tasa SIS vigente 2026; cargo empleador.'),
('CL','crp_rate',0.009,'2026-08-01','https://www.mintrab.gob.cl/cotizacion-con-rentabilidad-protegida-crp-el-nuevo-aporte-de-cargo-del-empleador-que-comienza-en-agosto-y-complementara-futuras-pensiones/','MinTrabajo — CRP agosto 2026','Cotización con Rentabilidad Protegida, cargo empleador.'),
('CL','ordinary_weekly_hours',42,'2026-04-01','https://www.dt.gob.cl/portal/1626/w3-article-129008.html','DT — Ley 21.561','Jornada ordinaria transitoria desde abril 2026.')
ON CONFLICT (country_code,parameter_key,effective_from) DO UPDATE SET value_numeric=EXCLUDED.value_numeric,source_url=EXCLUDED.source_url,source_reference=EXCLUDED.source_reference,notes=EXCLUDED.notes;

CREATE TABLE IF NOT EXISTS public.people_absences (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 employee_id uuid NOT NULL REFERENCES public.people_employees(id) ON DELETE CASCADE, absence_type text NOT NULL,
 starts_on date NOT NULL, ends_on date NOT NULL, paid boolean NOT NULL DEFAULT false, source_document_id uuid,
 notes text, created_at timestamptz NOT NULL DEFAULT now(), CHECK (ends_on>=starts_on)
);
CREATE TABLE IF NOT EXISTS public.people_vacation_balances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 employee_id uuid NOT NULL REFERENCES public.people_employees(id) ON DELETE CASCADE, as_of_date date NOT NULL,
 accrued_days numeric(8,3) NOT NULL DEFAULT 0, used_days numeric(8,3) NOT NULL DEFAULT 0, pending_days numeric(8,3) NOT NULL DEFAULT 0,
 UNIQUE(employee_id,as_of_date)
);
CREATE TABLE IF NOT EXISTS public.people_terminations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 employee_id uuid NOT NULL REFERENCES public.people_employees(id) ON DELETE CASCADE, termination_date date NOT NULL,
 termination_cause text NOT NULL, notice_pay numeric(14,2) NOT NULL DEFAULT 0, severance_years numeric(8,3) NOT NULL DEFAULT 0,
 severance_amount numeric(14,2) NOT NULL DEFAULT 0, vacation_pay numeric(14,2) NOT NULL DEFAULT 0, other_amount numeric(14,2) NOT NULL DEFAULT 0,
 deductions numeric(14,2) NOT NULL DEFAULT 0, total_amount numeric(14,2) NOT NULL DEFAULT 0,
 calculation_version text NOT NULL DEFAULT 'cl-2026.1', components jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL DEFAULT auth.uid()
);
CREATE TABLE IF NOT EXISTS public.people_payroll_liquidations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 payroll_period_id uuid NOT NULL REFERENCES public.people_payroll_periods(id) ON DELETE CASCADE, employee_id uuid NOT NULL REFERENCES public.people_employees(id) ON DELETE CASCADE,
 payroll_item_id uuid REFERENCES public.people_payroll_items(id) ON DELETE SET NULL, status text NOT NULL DEFAULT 'draft',
 issued_at timestamptz, document_payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(payroll_period_id,employee_id)
);
CREATE TABLE IF NOT EXISTS public.people_lre_rows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 payroll_period_id uuid NOT NULL REFERENCES public.people_payroll_periods(id) ON DELETE CASCADE, employee_id uuid NOT NULL REFERENCES public.people_employees(id) ON DELETE CASCADE,
 row_data jsonb NOT NULL DEFAULT '{}'::jsonb, validation_status text NOT NULL DEFAULT 'pending', validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(payroll_period_id,employee_id)
);

ALTER TABLE public.people_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_vacation_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_terminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_payroll_liquidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_lre_rows ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.people_absences,public.people_vacation_balances,public.people_terminations,public.people_payroll_liquidations,public.people_lre_rows TO authenticated;

DROP POLICY IF EXISTS people_absences_select ON public.people_absences;
CREATE POLICY people_absences_select ON public.people_absences FOR SELECT USING(private.is_business_member(business_id,auth.uid()));
DROP POLICY IF EXISTS people_absences_write ON public.people_absences;
CREATE POLICY people_absences_write ON public.people_absences FOR ALL USING(private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[])) WITH CHECK(private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
DROP POLICY IF EXISTS people_vacation_select ON public.people_vacation_balances;
CREATE POLICY people_vacation_select ON public.people_vacation_balances FOR SELECT USING(private.is_business_member(business_id,auth.uid()));
DROP POLICY IF EXISTS people_vacation_write ON public.people_vacation_balances;
CREATE POLICY people_vacation_write ON public.people_vacation_balances FOR ALL USING(private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[])) WITH CHECK(private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
DROP POLICY IF EXISTS people_terminations_select ON public.people_terminations;
CREATE POLICY people_terminations_select ON public.people_terminations FOR SELECT USING(private.is_business_member(business_id,auth.uid()));
DROP POLICY IF EXISTS people_terminations_write ON public.people_terminations;
CREATE POLICY people_terminations_write ON public.people_terminations FOR ALL USING(private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[])) WITH CHECK(private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
DROP POLICY IF EXISTS people_liquidations_select ON public.people_payroll_liquidations;
CREATE POLICY people_liquidations_select ON public.people_payroll_liquidations FOR SELECT USING(private.is_business_member(business_id,auth.uid()));
DROP POLICY IF EXISTS people_liquidations_write ON public.people_payroll_liquidations;
CREATE POLICY people_liquidations_write ON public.people_payroll_liquidations FOR ALL USING(private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[])) WITH CHECK(private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
DROP POLICY IF EXISTS people_lre_select ON public.people_lre_rows;
CREATE POLICY people_lre_select ON public.people_lre_rows FOR SELECT USING(private.is_business_member(business_id,auth.uid()));
DROP POLICY IF EXISTS people_lre_write ON public.people_lre_rows;
CREATE POLICY people_lre_write ON public.people_lre_rows FOR ALL USING(private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[])) WITH CHECK(private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));

CREATE OR REPLACE FUNCTION public.calculate_people_vacation_balance(p_employee_id uuid,p_as_of_date date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,private AS $$
DECLARE e record; start_d date; accrued numeric; used numeric; pending numeric;
BEGIN
 SELECT * INTO e FROM public.people_employees WHERE id=p_employee_id;
 IF NOT FOUND OR NOT private.is_business_member(e.business_id,auth.uid()) THEN RAISE EXCEPTION 'employee not accessible'; END IF;
 start_d:=e.hire_date;
 accrued:=greatest(0,round(((p_as_of_date-start_d)::numeric/365.0)*15,3));
 SELECT COALESCE(sum((ends_on-starts_on+1)::numeric),0) INTO used FROM public.people_absences WHERE employee_id=p_employee_id AND absence_type='vacation' AND starts_on>=start_d AND ends_on<=p_as_of_date;
 pending:=greatest(0,accrued-used);
 INSERT INTO public.people_vacation_balances(business_id,employee_id,as_of_date,accrued_days,used_days,pending_days) VALUES(e.business_id,p_employee_id,p_as_of_date,accrued,used,pending)
 ON CONFLICT(employee_id,as_of_date) DO UPDATE SET accrued_days=EXCLUDED.accrued_days,used_days=EXCLUDED.used_days,pending_days=EXCLUDED.pending_days;
 RETURN jsonb_build_object('employee_id',p_employee_id,'as_of_date',p_as_of_date,'accrued_days',accrued,'used_days',used,'pending_days',pending);
END $$;
GRANT EXECUTE ON FUNCTION public.calculate_people_vacation_balance(uuid,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.prepare_people_lre(p_payroll_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,private AS $$
DECLARE p record; i record; e record; count_rows integer:=0; errors jsonb;
BEGIN
 SELECT * INTO p FROM public.people_payroll_periods WHERE id=p_payroll_period_id;
 IF NOT FOUND OR NOT private.has_business_role(p.business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]) THEN RAISE EXCEPTION 'payroll period not accessible'; END IF;
 IF p.status NOT IN ('calculated','approved','closed') THEN RAISE EXCEPTION 'period must be calculated before LRE preparation'; END IF;
 DELETE FROM public.people_lre_rows WHERE payroll_period_id=p_payroll_period_id;
 FOR i IN SELECT * FROM public.people_payroll_items WHERE payroll_period_id=p_payroll_period_id LOOP
   SELECT * INTO e FROM public.people_employees WHERE id=i.employee_id;
   errors:='[]'::jsonb;
   IF e.national_id IS NULL OR btrim(e.national_id)='' THEN errors:=errors||jsonb_build_array('RUT del trabajador faltante'); END IF;
   IF i.gross_taxable<0 OR i.net_pay<0 THEN errors:=errors||jsonb_build_array('Montos negativos inválidos'); END IF;
   INSERT INTO public.people_lre_rows(business_id,payroll_period_id,employee_id,row_data,validation_status,validation_errors)
   VALUES(p.business_id,p_payroll_period_id,i.employee_id,jsonb_build_object('employee_id',i.employee_id,'national_id',e.national_id,'gross_taxable',i.gross_taxable,'gross_non_taxable',i.gross_non_taxable,'deductions',i.deductions,'net_pay',i.net_pay,'employer_cost',i.employer_cost_amount,'calculation_version',i.calculation_version),CASE WHEN jsonb_array_length(errors)=0 THEN 'valid' ELSE 'invalid' END,errors);
   count_rows:=count_rows+1;
 END LOOP;
 RETURN jsonb_build_object('period_id',p_payroll_period_id,'rows',count_rows,'valid',(SELECT count(*) FROM public.people_lre_rows WHERE payroll_period_id=p_payroll_period_id AND validation_status='valid'),'invalid',(SELECT count(*) FROM public.people_lre_rows WHERE payroll_period_id=p_payroll_period_id AND validation_status='invalid'));
END $$;
GRANT EXECUTE ON FUNCTION public.prepare_people_lre(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_people_absences_employee_dates ON public.people_absences(employee_id,starts_on,ends_on);
CREATE INDEX IF NOT EXISTS idx_people_vacation_employee_date ON public.people_vacation_balances(employee_id,as_of_date);
CREATE INDEX IF NOT EXISTS idx_people_terminations_employee ON public.people_terminations(employee_id);
CREATE INDEX IF NOT EXISTS idx_people_liquidations_period ON public.people_payroll_liquidations(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_people_lre_period ON public.people_lre_rows(payroll_period_id);
