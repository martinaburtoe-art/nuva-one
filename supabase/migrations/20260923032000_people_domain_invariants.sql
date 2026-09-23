-- Nüva People — domain invariants.
-- Rejects impossible negative monetary/time/vacation values at database boundary.

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_contracts_salary_nonnegative_ck') THEN ALTER TABLE public.people_contracts ADD CONSTRAINT people_contracts_salary_nonnegative_ck CHECK (salary_amount >= 0); END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_contracts_weekly_hours_positive_ck') THEN ALTER TABLE public.people_contracts ADD CONSTRAINT people_contracts_weekly_hours_positive_ck CHECK (weekly_hours > 0); END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_contracts_work_days_positive_ck') THEN ALTER TABLE public.people_contracts ADD CONSTRAINT people_contracts_work_days_positive_ck CHECK (work_days > 0); END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_employees_overtime_nonnegative_ck') THEN ALTER TABLE public.people_employees ADD CONSTRAINT people_employees_overtime_nonnegative_ck CHECK (overtime_hours >= 0); END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_leave_requests_valid_range_ck') THEN ALTER TABLE public.people_leave_requests ADD CONSTRAINT people_leave_requests_valid_range_ck CHECK (start_date <= end_date AND days > 0); END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_payroll_inputs_nonnegative_ck') THEN ALTER TABLE public.people_payroll_inputs ADD CONSTRAINT people_payroll_inputs_nonnegative_ck CHECK (absences_days >= 0 AND overtime_hours >= 0 AND gratification_amount >= 0); END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_payroll_items_nonnegative_ck') THEN ALTER TABLE public.people_payroll_items ADD CONSTRAINT people_payroll_items_nonnegative_ck CHECK (gross_taxable >= 0 AND gross_non_taxable >= 0 AND net_pay >= 0 AND overtime_amount >= 0 AND vacation_amount >= 0 AND employer_cost_amount >= 0); END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_payroll_postings_nonnegative_ck') THEN ALTER TABLE public.people_payroll_postings ADD CONSTRAINT people_payroll_postings_nonnegative_ck CHECK (total_amount >= 0); END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_terminations_nonnegative_ck') THEN ALTER TABLE public.people_terminations ADD CONSTRAINT people_terminations_nonnegative_ck CHECK (severance_amount >= 0 AND other_amount >= 0 AND total_amount >= 0); END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='people_vacation_balances_nonnegative_ck') THEN ALTER TABLE public.people_vacation_balances ADD CONSTRAINT people_vacation_balances_nonnegative_ck CHECK (accrued_days >= 0 AND used_days >= 0 AND available_days >= 0 AND progressive_days >= 0); END IF;
END $$;