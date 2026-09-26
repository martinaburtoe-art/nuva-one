-- Remove redundant indexes duplicated by unique constraints.
DROP INDEX IF EXISTS public.idx_people_gratification_settings_business_year;
DROP INDEX IF EXISTS public.idx_people_payroll_items_period_employee;
DROP INDEX IF EXISTS public.idx_people_payroll_period_business;
