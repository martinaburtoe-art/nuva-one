-- Caja Pro lifecycle hardening.
CREATE OR REPLACE FUNCTION public.guard_cash_register_lifecycle() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN IF OLD.status = 'closed' THEN RAISE EXCEPTION 'closed cash register is immutable'; END IF; IF NEW.status = 'closed' AND (NEW.closed_at IS NULL OR NEW.counted_cash IS NULL) THEN RAISE EXCEPTION 'closed cash register requires closed_at and counted_cash'; END IF; IF NEW.status = 'open' AND (NEW.closed_at IS NOT NULL OR NEW.counted_cash IS NOT NULL) THEN RAISE EXCEPTION 'open cash register cannot have closing data'; END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_guard_cash_register_lifecycle ON public.cash_registers;
CREATE TRIGGER trg_guard_cash_register_lifecycle BEFORE UPDATE ON public.cash_registers FOR EACH ROW EXECUTE FUNCTION public.guard_cash_register_lifecycle();
REVOKE UPDATE, DELETE ON public.cash_register_movements FROM authenticated;
DROP POLICY IF EXISTS "Staff update cash movements" ON public.cash_register_movements;
DROP POLICY IF EXISTS "Staff delete cash movements" ON public.cash_register_movements;
