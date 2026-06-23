-- Adds line items to sales and purchases so they can be linked to products,
-- and adds DB-level triggers so that:
--   1) Creating a sale with items decrements product stock and creates an
--      income transaction automatically.
--   2) Creating a purchase with items increments product stock and creates
--      an expense transaction automatically.
--   3) Reverting (deleting) a sale/purchase or changing its status away from
--      paid/received reverses the stock effect, to avoid double-counting.
--
-- This is the core "everything connected" requirement: a sale should never
-- be an island disconnected from inventory and cash flow.

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS stock_applied BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS stock_applied BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

-- items shape: [{ "product_id": "uuid", "name": "text", "qty": number, "price": number }]

-- ============================================================
-- SALES: apply stock + create income transaction
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_sale_effects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item JSONB;
  tx_id UUID;
  should_apply BOOLEAN;
BEGIN
  should_apply := (NEW.status IN ('paid','pending')) AND NOT NEW.stock_applied;

  IF should_apply THEN
    -- Decrement stock for each item with a product_id
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      IF (item->>'product_id') IS NOT NULL AND (item->>'product_id') != '' THEN
        UPDATE public.products
        SET stock = GREATEST(0, stock - COALESCE((item->>'qty')::int, 0))
        WHERE id = (item->>'product_id')::uuid AND business_id = NEW.business_id;
      END IF;
    END LOOP;

    -- Create matching income transaction if one doesn't already exist
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

-- When a sale's status changes AWAY from paid/pending (e.g. to cancelled),
-- reverse the stock/transaction effect once.
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

-- ============================================================
-- PURCHASES: apply stock + create expense transaction (only when received)
-- ============================================================
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

-- ============================================================
-- QUOTES: mark which quote a sale was converted from (read-only helper)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sales_quote ON public.sales(quote_id);
