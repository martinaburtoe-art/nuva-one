DROP POLICY IF EXISTS "Owner/admin manage members" ON public.business_members;

DROP POLICY IF EXISTS "Owner/admin insert members" ON public.business_members;

CREATE POLICY "Owner/admin insert members" ON public.business_members
  FOR INSERT
  WITH CHECK (public.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));

DROP POLICY IF EXISTS "Owner/admin update members" ON public.business_members;

CREATE POLICY "Owner/admin update members" ON public.business_members
  FOR UPDATE
  USING (public.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]))
  WITH CHECK (public.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));

DROP POLICY IF EXISTS "Owner/admin or self delete members" ON public.business_members;

CREATE POLICY "Owner/admin or self delete members" ON public.business_members
  FOR DELETE
  USING (
    public.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::public.member_role[])
    OR user_id = auth.uid()
  );

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS stock_applied BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS stock_applied BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.apply_sale_effects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item JSONB;
  tx_id UUID;
  should_apply BOOLEAN;
BEGIN
  should_apply := (NEW.status IN ('paid','pending')) AND NOT NEW.stock_applied;
  IF should_apply THEN
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      IF (item->>'product_id') IS NOT NULL AND (item->>'product_id') != '' THEN
        UPDATE public.products
        SET stock = GREATEST(0, stock - COALESCE((item->>'qty')::int, 0))
        WHERE id = (item->>'product_id')::uuid AND business_id = NEW.business_id;
      END IF;
    END LOOP;
    IF NEW.transaction_id IS NULL AND NEW.total > 0 THEN
      INSERT INTO public.transactions (business_id, type, category, amount, description, tx_date)
      VALUES (NEW.business_id, 'income', 'Ventas', NEW.total, 'Venta: ' || COALESCE(NEW.customer_name, 'Cliente'), NEW.sale_date)
      RETURNING id INTO tx_id;
      NEW.transaction_id := tx_id;
    END IF;
    NEW.stock_applied := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.revert_sale_effects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item JSONB;
BEGIN
  IF OLD.stock_applied THEN
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(OLD.items, '[]'::jsonb))
    LOOP
      IF (item->>'product_id') IS NOT NULL AND (item->>'product_id') != '' THEN
        UPDATE public.products
        SET stock = stock + COALESCE((item->>'qty')::int, 0)
        WHERE id = (item->>'product_id')::uuid AND business_id = OLD.business_id;
      END IF;
    END LOOP;
    IF OLD.transaction_id IS NOT NULL THEN
      DELETE FROM public.transactions WHERE id = OLD.transaction_id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_sale_effects ON public.sales;
CREATE TRIGGER trg_apply_sale_effects
  BEFORE INSERT OR UPDATE OF status, items, total ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.apply_sale_effects();

DROP TRIGGER IF EXISTS trg_revert_sale_effects ON public.sales;
CREATE TRIGGER trg_revert_sale_effects
  BEFORE DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.revert_sale_effects();

CREATE OR REPLACE FUNCTION public.unapply_sale_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item JSONB;
BEGIN
  IF OLD.stock_applied AND NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(OLD.items, '[]'::jsonb))
    LOOP
      IF (item->>'product_id') IS NOT NULL AND (item->>'product_id') != '' THEN
        UPDATE public.products
        SET stock = stock + COALESCE((item->>'qty')::int, 0)
        WHERE id = (item->>'product_id')::uuid AND business_id = OLD.business_id;
      END IF;
    END LOOP;
    IF OLD.transaction_id IS NOT NULL THEN
      DELETE FROM public.transactions WHERE id = OLD.transaction_id;
    END IF;
    NEW.stock_applied := false;
    NEW.transaction_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unapply_sale_on_cancel ON public.sales;
CREATE TRIGGER trg_unapply_sale_on_cancel
  BEFORE UPDATE OF status ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.unapply_sale_on_cancel();

CREATE OR REPLACE FUNCTION public.apply_purchase_effects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item JSONB;
  tx_id UUID;
BEGIN
  IF NEW.status IN ('received','paid') AND NOT NEW.stock_applied THEN
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      IF (item->>'product_id') IS NOT NULL AND (item->>'product_id') != '' THEN
        UPDATE public.products
        SET stock = stock + COALESCE((item->>'qty')::int, 0)
        WHERE id = (item->>'product_id')::uuid AND business_id = NEW.business_id;
      END IF;
    END LOOP;
    IF NEW.transaction_id IS NULL AND NEW.total > 0 THEN
      INSERT INTO public.transactions (business_id, type, category, amount, description, tx_date)
      VALUES (NEW.business_id, 'expense', 'Compras', NEW.total, 'Compra: ' || COALESCE(NEW.supplier_name, 'Proveedor'), NEW.purchase_date)
      RETURNING id INTO tx_id;
      NEW.transaction_id := tx_id;
    END IF;
    NEW.stock_applied := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_purchase_effects ON public.purchases;
CREATE TRIGGER trg_apply_purchase_effects
  BEFORE INSERT OR UPDATE OF status, items, total ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.apply_purchase_effects();

CREATE OR REPLACE FUNCTION public.revert_purchase_effects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item JSONB;
BEGIN
  IF OLD.stock_applied THEN
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(OLD.items, '[]'::jsonb))
    LOOP
      IF (item->>'product_id') IS NOT NULL AND (item->>'product_id') != '' THEN
        UPDATE public.products
        SET stock = GREATEST(0, stock - COALESCE((item->>'qty')::int, 0))
        WHERE id = (item->>'product_id')::uuid AND business_id = OLD.business_id;
      END IF;
    END LOOP;
    IF OLD.transaction_id IS NOT NULL THEN
      DELETE FROM public.transactions WHERE id = OLD.transaction_id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_revert_purchase_effects ON public.purchases;
CREATE TRIGGER trg_revert_purchase_effects
  BEFORE DELETE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.revert_purchase_effects();

CREATE INDEX IF NOT EXISTS idx_sales_quote ON public.sales(quote_id);

DROP POLICY IF EXISTS "Members access audit_log" ON public.audit_log;

DROP POLICY IF EXISTS "Members read audit_log" ON public.audit_log;

CREATE POLICY "Members read audit_log" ON public.audit_log
  FOR SELECT
  USING (public.is_business_member(business_id, auth.uid()));

DROP POLICY IF EXISTS "Members insert audit_log" ON public.audit_log;

CREATE POLICY "Members insert audit_log" ON public.audit_log
  FOR INSERT
  WITH CHECK (public.is_business_member(business_id, auth.uid()));