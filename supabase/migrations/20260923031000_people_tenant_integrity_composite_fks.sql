-- Nüva People — tenant integrity: bind employee and payroll relations to business_id.
-- Evita referencias cruzadas entre empresas cuando UUIDs válidos provienen de otro tenant.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_employees_business_id_id_key') THEN
    ALTER TABLE public.people_employees ADD CONSTRAINT people_employees_business_id_id_key UNIQUE (business_id,id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_payroll_periods_business_id_id_key') THEN
    ALTER TABLE public.people_payroll_periods ADD CONSTRAINT people_payroll_periods_business_id_id_key UNIQUE (business_id,id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_contracts_employee_business_fk') THEN
    ALTER TABLE public.people_contracts ADD CONSTRAINT people_contracts_employee_business_fk FOREIGN KEY (business_id,employee_id) REFERENCES public.people_employees(business_id,id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_absences_employee_business_fk') THEN
    ALTER TABLE public.people_absences ADD CONSTRAINT people_absences_employee_business_fk FOREIGN KEY (business_id,employee_id) REFERENCES public.people_employees(business_id,id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_leave_requests_employee_business_fk') THEN
    ALTER TABLE public.people_leave_requests ADD CONSTRAINT people_leave_requests_employee_business_fk FOREIGN KEY (business_id,employee_id) REFERENCES public.people_employees(business_id,id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_payroll_inputs_employee_business_fk') THEN
    ALTER TABLE public.people_payroll_inputs ADD CONSTRAINT people_payroll_inputs_employee_business_fk FOREIGN KEY (business_id,employee_id) REFERENCES public.people_employees(business_id,id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_payroll_items_employee_business_fk') THEN
    ALTER TABLE public.people_payroll_items ADD CONSTRAINT people_payroll_items_employee_business_fk FOREIGN KEY (business_id,employee_id) REFERENCES public.people_employees(business_id,id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_payroll_liquidations_employee_business_fk') THEN
    ALTER TABLE public.people_payroll_liquidations ADD CONSTRAINT people_payroll_liquidations_employee_business_fk FOREIGN KEY (business_id,employee_id) REFERENCES public.people_employees(business_id,id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_lre_rows_employee_business_fk') THEN
    ALTER TABLE public.people_lre_rows ADD CONSTRAINT people_lre_rows_employee_business_fk FOREIGN KEY (business_id,employee_id) REFERENCES public.people_employees(business_id,id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_payroll_runs_period_business_fk') THEN
    ALTER TABLE public.people_payroll_runs ADD CONSTRAINT people_payroll_runs_period_business_fk FOREIGN KEY (business_id,payroll_period_id) REFERENCES public.people_payroll_periods(business_id,id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_payroll_postings_period_business_fk') THEN
    ALTER TABLE public.people_payroll_postings ADD CONSTRAINT people_payroll_postings_period_business_fk FOREIGN KEY (business_id,payroll_period_id) REFERENCES public.people_payroll_periods(business_id,id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_payroll_inputs_period_business_fk') THEN
    ALTER TABLE public.people_payroll_inputs ADD CONSTRAINT people_payroll_inputs_period_business_fk FOREIGN KEY (business_id,payroll_period_id) REFERENCES public.people_payroll_periods(business_id,id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_payroll_items_period_business_fk') THEN
    ALTER TABLE public.people_payroll_items ADD CONSTRAINT people_payroll_items_period_business_fk FOREIGN KEY (business_id,payroll_period_id) REFERENCES public.people_payroll_periods(business_id,id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_payroll_liquidations_period_business_fk') THEN
    ALTER TABLE public.people_payroll_liquidations ADD CONSTRAINT people_payroll_liquidations_period_business_fk FOREIGN KEY (business_id,payroll_period_id) REFERENCES public.people_payroll_periods(business_id,id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_lre_rows_period_business_fk') THEN
    ALTER TABLE public.people_lre_rows ADD CONSTRAINT people_lre_rows_period_business_fk FOREIGN KEY (business_id,payroll_period_id) REFERENCES public.people_payroll_periods(business_id,id) ON DELETE CASCADE;
  END IF;
END $$;
