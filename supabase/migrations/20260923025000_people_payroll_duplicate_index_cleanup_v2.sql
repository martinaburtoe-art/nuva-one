-- Remove redundant non-constraint indexes that duplicate UNIQUE constraint indexes.
DROP INDEX IF EXISTS public.idx_people_payroll_period_business;
DROP INDEX IF EXISTS public.idx_people_payroll_items_period_employee;
