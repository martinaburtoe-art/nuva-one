-- Nüva People — remove redundant payroll input indexes
DROP INDEX IF EXISTS public.people_payroll_inputs_business_id_idx;
DROP INDEX IF EXISTS public.people_payroll_inputs_employee_id_idx;
