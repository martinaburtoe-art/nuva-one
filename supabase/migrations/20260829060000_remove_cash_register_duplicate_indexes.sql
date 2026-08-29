-- Remove standalone duplicate access paths left by successive cash-register
-- hardening migrations. Constraint-backed indexes are intentionally preserved.
DROP INDEX IF EXISTS public.idx_cash_register_movements_register_date;
DROP INDEX IF EXISTS public.uq_cash_register_open_business;
