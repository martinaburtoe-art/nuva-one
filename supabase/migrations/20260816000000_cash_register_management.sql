-- Caja Pro: persistent cash-register sessions and auditable movements.
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (opening_amount >= 0),
  closed_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  closed_at TIMESTAMPTZ,
  counted_cash NUMERIC(12,2),
  closing_note TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cash_register_close_state CHECK ((status = 'open' AND closed_at IS NULL AND counted_cash IS NULL) OR (status = 'closed' AND closed_at IS NOT NULL AND counted_cash IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_register_one_open_per_business ON public.cash_registers (business_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_cash_registers_business_created ON public.cash_registers (business_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.cash_register_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('deposit','withdrawal')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cash_movements_register_created ON public.cash_register_movements (cash_register_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_movements_business_created ON public.cash_register_movements (business_id, created_at DESC);
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_movements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.cash_registers TO authenticated;
GRANT SELECT, INSERT ON public.cash_register_movements TO authenticated;
GRANT ALL ON public.cash_registers TO service_role;
GRANT ALL ON public.cash_register_movements TO service_role;
DROP POLICY IF EXISTS "Members see cash registers" ON public.cash_registers;
CREATE POLICY "Members see cash registers" ON public.cash_registers FOR SELECT USING (public.is_business_member(business_id, auth.uid()));
DROP POLICY IF EXISTS "Members open cash register" ON public.cash_registers;
CREATE POLICY "Members open cash register" ON public.cash_registers FOR INSERT WITH CHECK (public.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]) AND opened_by = auth.uid());
DROP POLICY IF EXISTS "Members close cash register" ON public.cash_registers;
CREATE POLICY "Members close cash register" ON public.cash_registers FOR UPDATE USING (public.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[])) WITH CHECK (public.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]));
DROP POLICY IF EXISTS "Members see cash movements" ON public.cash_register_movements;
CREATE POLICY "Members see cash movements" ON public.cash_register_movements FOR SELECT USING (public.is_business_member(business_id, auth.uid()));
DROP POLICY IF EXISTS "Staff record cash movements" ON public.cash_register_movements;
CREATE POLICY "Staff record cash movements" ON public.cash_register_movements FOR INSERT WITH CHECK (public.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]) AND created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.cash_registers r WHERE r.id = cash_register_id AND r.business_id = cash_register_movements.business_id AND r.status = 'open'));
CREATE OR REPLACE FUNCTION public.validate_cash_movement_business() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.cash_registers WHERE id = NEW.cash_register_id AND business_id = NEW.business_id) THEN RAISE EXCEPTION 'cash_register_id does not belong to business_id'; END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_validate_cash_movement_business ON public.cash_register_movements;
CREATE TRIGGER trg_validate_cash_movement_business BEFORE INSERT OR UPDATE ON public.cash_register_movements FOR EACH ROW EXECUTE FUNCTION public.validate_cash_movement_business();
