-- Nüva People — Chile payroll/compliance model
-- Legal parameters are versioned; this migration is the database contract, not legal advice.

CREATE TABLE IF NOT EXISTS public.people_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  first_name text NOT NULL, last_name text NOT NULL, national_id text, email text, phone text, birth_date date,
  hire_date date NOT NULL DEFAULT current_date, termination_date date,
  employment_status text NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active','inactive','terminated','on_leave')),
  employment_type text NOT NULL DEFAULT 'indefinite', job_title text, department text, cost_center_id uuid,
  manager_id uuid REFERENCES public.people_employees(id) ON DELETE SET NULL, bank_name text, bank_account_type text,
  bank_account_last4 text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.people_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.people_employees(id) ON DELETE CASCADE, contract_type text NOT NULL,
  start_date date NOT NULL, end_date date, weekly_hours numeric(5,2) NOT NULL DEFAULT 42, work_days integer NOT NULL DEFAULT 5,
  salary_amount numeric(14,2) NOT NULL DEFAULT 0, salary_type text NOT NULL DEFAULT 'monthly', status text NOT NULL DEFAULT 'active',
  signed_at timestamptz, document_id uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (weekly_hours > 0 AND weekly_hours <= 45)
);

CREATE TABLE IF NOT EXISTS public.people_attendance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.people_employees(id) ON DELETE CASCADE, event_at timestamptz NOT NULL,
  event_type text NOT NULL CHECK(event_type IN ('check_in','check_out','break_start','break_end','manual_adjustment')),
  source text NOT NULL DEFAULT 'manual', metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.people_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.people_employees(id) ON DELETE CASCADE, leave_type text NOT NULL,
  start_date date NOT NULL, end_date date NOT NULL, days numeric(6,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
  reason text, approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), CHECK(end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.people_payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_year integer NOT NULL, period_month integer NOT NULL CHECK(period_month BETWEEN 1 AND 12),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','calculated','approved','closed','void')),
  calculation_version text NOT NULL DEFAULT 'cl-2026.1', parameter_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz, approved_at timestamptz, approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(business_id,period_year,period_month)
);

CREATE TABLE IF NOT EXISTS public.people_payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payroll_period_id uuid NOT NULL REFERENCES public.people_payroll_periods(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.people_employees(id) ON DELETE CASCADE,
  gross_taxable numeric(14,2) NOT NULL DEFAULT 0, gross_non_taxable numeric(14,2) NOT NULL DEFAULT 0,
  deductions numeric(14,2) NOT NULL DEFAULT 0, employer_cost_amount numeric(14,2) NOT NULL DEFAULT 0,
  net_pay numeric(14,2) NOT NULL DEFAULT 0, overtime_amount numeric(14,2) NOT NULL DEFAULT 0,
  vacation_amount numeric(14,2) NOT NULL DEFAULT 0, income_tax numeric(14,2) NOT NULL DEFAULT 0,
  social_security numeric(14,2) NOT NULL DEFAULT 0, components jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb, calculation_version text NOT NULL DEFAULT 'cl-2026.1',
  parameter_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(payroll_period_id,employee_id)
);

CREATE TABLE IF NOT EXISTS public.people_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.people_employees(id) ON DELETE CASCADE, document_type text NOT NULL,
  title text NOT NULL, storage_path text, issue_date date, expiry_date date, status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.people_compliance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.people_employees(id) ON DELETE CASCADE, category text NOT NULL, title text NOT NULL,
  status text NOT NULL DEFAULT 'pending', due_date date, source_reference text,
  evidence_document_id uuid REFERENCES public.people_documents(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.people_legal_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), country_code text NOT NULL DEFAULT 'CL', parameter_key text NOT NULL,
  value_numeric numeric(18,6), value_text text, effective_from date NOT NULL, effective_to date,
  source_url text NOT NULL, source_reference text NOT NULL, notes text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(country_code,parameter_key,effective_from)
);

CREATE TABLE IF NOT EXISTS public.people_payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payroll_period_id uuid NOT NULL REFERENCES public.people_payroll_periods(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL, status text NOT NULL DEFAULT 'created', result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(business_id,idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.people_payroll_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payroll_period_id uuid NOT NULL REFERENCES public.people_payroll_periods(id) ON DELETE CASCADE,
  posting_key text NOT NULL, total_amount numeric(14,2) NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'pending',
  finance_reference uuid, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(business_id,posting_key)
);

CREATE TABLE IF NOT EXISTS public.people_lre_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payroll_period_id uuid NOT NULL REFERENCES public.people_payroll_periods(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'draft',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb, file_hash text,
  generated_at timestamptz, generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(payroll_period_id)
);

CREATE TABLE IF NOT EXISTS public.people_karin_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  reporter_employee_id uuid REFERENCES public.people_employees(id) ON DELETE SET NULL,
  accused_employee_id uuid REFERENCES public.people_employees(id) ON DELETE SET NULL,
  case_type text NOT NULL, status text NOT NULL DEFAULT 'received', received_at timestamptz NOT NULL DEFAULT now(),
  restricted_notes text, measures jsonb NOT NULL DEFAULT '[]'::jsonb, resolution text, closed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.people_vacation_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.people_employees(id) ON DELETE CASCADE, as_of_date date NOT NULL,
  accrued_days numeric(8,2) NOT NULL DEFAULT 0, used_days numeric(8,2) NOT NULL DEFAULT 0, available_days numeric(8,2) NOT NULL DEFAULT 0,
  progressive_days numeric(8,2) NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(employee_id,as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_people_employees_business ON public.people_employees(business_id);
CREATE INDEX IF NOT EXISTS idx_people_contracts_employee ON public.people_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_people_attendance_employee_date ON public.people_attendance_events(employee_id,event_at);
CREATE INDEX IF NOT EXISTS idx_people_leave_business_status ON public.people_leave_requests(business_id,status);
CREATE INDEX IF NOT EXISTS idx_people_payroll_period_business ON public.people_payroll_periods(business_id,period_year,period_month);
CREATE INDEX IF NOT EXISTS idx_people_payroll_items_period ON public.people_payroll_items(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_people_compliance_due ON public.people_compliance_items(business_id,due_date);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['people_employees','people_contracts','people_attendance_events','people_leave_requests','people_payroll_periods','people_payroll_items','people_documents','people_compliance_items','people_payroll_runs','people_payroll_postings','people_lre_exports','people_karin_cases','people_vacation_balances'] LOOP
    EXECUTE format('GRANT SELECT,INSERT,UPDATE ON public.%I TO authenticated',t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('DROP POLICY IF EXISTS people_member_select ON public.%I',t);
    EXECUTE format('CREATE POLICY people_member_select ON public.%I FOR SELECT USING (private.is_business_member(business_id,auth.uid()))',t);
    EXECUTE format('DROP POLICY IF EXISTS people_member_insert ON public.%I',t);
    EXECUTE format('CREATE POLICY people_member_insert ON public.%I FOR INSERT WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY[''owner'',''admin'',''staff'']::public.member_role[]))',t);
    EXECUTE format('DROP POLICY IF EXISTS people_member_update ON public.%I',t);
    EXECUTE format('CREATE POLICY people_member_update ON public.%I FOR UPDATE USING (private.has_business_role(business_id,auth.uid(),ARRAY[''owner'',''admin'',''staff'']::public.member_role[])) WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY[''owner'',''admin'',''staff'']::public.member_role[]))',t);
    EXECUTE format('DROP POLICY IF EXISTS people_admin_delete ON public.%I',t);
    EXECUTE format('CREATE POLICY people_admin_delete ON public.%I FOR DELETE USING (private.has_business_role(business_id,auth.uid(),ARRAY[''owner'',''admin'']::public.member_role[]))',t);
  END LOOP;
END $$;

REVOKE INSERT,UPDATE,DELETE ON public.people_legal_parameters FROM authenticated;
GRANT SELECT ON public.people_legal_parameters TO authenticated;

DROP POLICY IF EXISTS people_karin_select ON public.people_karin_cases;
CREATE POLICY people_karin_select ON public.people_karin_cases FOR SELECT USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
DROP POLICY IF EXISTS people_karin_insert ON public.people_karin_cases;
CREATE POLICY people_karin_insert ON public.people_karin_cases FOR INSERT WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));
DROP POLICY IF EXISTS people_karin_update ON public.people_karin_cases;
CREATE POLICY people_karin_update ON public.people_karin_cases FOR UPDATE USING (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[])) WITH CHECK (private.has_business_role(business_id,auth.uid(),ARRAY['owner','admin']::public.member_role[]));

INSERT INTO public.people_legal_parameters(country_code,parameter_key,value_numeric,effective_from,source_url,source_reference,notes) VALUES
('CL','minimum_monthly_wage_18_65',553553,'2026-05-01','https://www.bcn.cl/leychile/navegar?idNorma=1225354','Ley 21.830, art. 1','Ingreso mínimo mensual vigente desde 01-05-2026'),
('CL','ordinary_weekly_hours',42,'2026-04-26','https://www.dt.gob.cl/legislacion/1624/w3-article-129008.html','ORD N°142/09 y Ley 21.561','Límite ordinario vigente desde 26-04-2026'),
('CL','ordinary_weekly_hours',40,'2028-04-26','https://www.dt.gob.cl/legislacion/1624/w3-article-129008.html','Ley 21.561','Reducción programada a 40 horas')
ON CONFLICT (country_code,parameter_key,effective_from) DO UPDATE SET value_numeric=EXCLUDED.value_numeric,source_url=EXCLUDED.source_url,source_reference=EXCLUDED.source_reference,notes=EXCLUDED.notes;
