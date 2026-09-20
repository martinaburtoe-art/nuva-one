-- Keep sale/purchase stock and financial effects synchronized across their full lifecycle.
-- The original triggers applied effects on INSERT but only reverted sales on cancellation
-- and did not revert purchases when a received/paid purchase was moved back to pending/cancelled.
-- They also failed to re-sync stock/transactions when active items or totals were edited.
--
-- PostgreSQL executes BEFORE row triggers in the same transaction as the triggering statement,
-- so an exception here rolls back the row and every side effect atomically.

CREATE OR REPLACE FUNCTION public.sync_sale_effects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  tx_id UUID;
  qty_needed INT;
  product_name TEXT;
  updated_id UUID;
  old_effect_must_be_reverted BOOLEAN := false;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.stock_applied THEN
    old_effect_must_be_reverted :=
      OLD.business_id IS DISTINCT FROM NEW.business_id
      OR OLD.status IS DISTINCT FROM NEW.status
      OR OLD.items IS DISTINCT FROM NEW.items
      OR OLD.total IS DISTINCT FROM NEW.total
      OR OLD.sale_date IS DISTINCT FROM NEW.sale_date
      OR OLD.customer_name IS DISTINCT FROM NEW.customer_name;

    IF old_effect_must_be_reverted THEN
      FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(OLD.items, '[]'::jsonb))
      LOOP
        IF NULLIF(item->>'product_id', '') IS NOT NULL THEN
          UPDATE public.products
          SET stock = stock + COALESCE((item->>'qty')::int, 0)
          WHERE id = (item->>'product_id')::uuid
            AND business_id = OLD.business_id;
        END IF;
      END LOOP;

      IF OLD.transaction_id IS NOT NULL THEN
        DELETE FROM public.transactions WHERE id = OLD.transaction_id;
      END IF;

      NEW.stock_applied := false;
      NEW.transaction_id := NULL;
    END IF;
  END IF;

  IF NEW.status IN ('paid', 'pending') AND NOT NEW.stock_applied THEN
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      IF NULLIF(item->>'product_id', '') IS NOT NULL THEN
        qty_needed := COALESCE((item->>'qty')::int, 0);

        UPDATE public.products
        SET stock = stock - qty_needed
        WHERE id = (item->>'product_id')::uuid
          AND business_id = NEW.business_id
          AND stock >= qty_needed
        RETURNING id INTO updated_id;

        IF updated_id IS NULL THEN
          SELECT name
          INTO product_name
          FROM public.products
          WHERE id = (item->>'product_id')::uuid
            AND business_id = NEW.business_id;

          RAISE EXCEPTION 'Stock insuficiente para "%": no hay % unidades disponibles',
            COALESCE(product_name, item->>'name'),
            qty_needed
            USING ERRCODE = 'check_violation';
        END IF;

        updated_id := NULL;
      END IF;
    END LOOP;

    IF NEW.transaction_id IS NULL AND NEW.total > 0 THEN
      INSERT INTO public.transactions (
        business_id, type, category, amount, description, tx_date
      )
      VALUES (
        NEW.business_id,
        'income',
        'Ventas',
        NEW.total,
        'Venta: ' || COALESCE(NEW.customer_name, 'Cliente'),
        NEW.sale_date
      )
      RETURNING id INTO tx_id;

      NEW.transaction_id := tx_id;
    END IF;

    NEW.stock_applied := true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_purchase_effects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  tx_id UUID;
  old_effect_must_be_reverted BOOLEAN := false;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.stock_applied THEN
    old_effect_must_be_reverted :=
      OLD.business_id IS DISTINCT FROM NEW.business_id
      OR OLD.status IS DISTINCT FROM NEW.status
      OR OLD.items IS DISTINCT FROM NEW.items
      OR OLD.total IS DISTINCT FROM NEW.total
      OR OLD.purchase_date IS DISTINCT FROM NEW.purchase_date
      OR OLD.supplier_name IS DISTINCT FROM NEW.supplier_name;

    IF old_effect_must_be_reverted THEN
      FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(OLD.items, '[]'::jsonb))
      LOOP
        IF NULLIF(item->>'product_id', '') IS NOT NULL THEN
          UPDATE public.products
          SET stock = GREATEST(0, stock - COALESCE((item->>'qty')::int, 0))
          WHERE id = (item->>'product_id')::uuid
            AND business_id = OLD.business_id;
        END IF;
      END LOOP;

      IF OLD.transaction_id IS NOT NULL THEN
        DELETE FROM public.transactions WHERE id = OLD.transaction_id;
      END IF;

      NEW.stock_applied := false;
      NEW.transaction_id := NULL;
    END IF;
  END IF;

  IF NEW.status IN ('received', 'paid') AND NOT NEW.stock_applied THEN
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      IF NULLIF(item->>'product_id', '') IS NOT NULL THEN
        UPDATE public.products
        SET stock = stock + COALESCE((item->>'qty')::int, 0)
        WHERE id = (item->>'product_id')::uuid
          AND business_id = NEW.business_id;
      END IF;
    END LOOP;

    IF NEW.transaction_id IS NULL AND NEW.total > 0 THEN
      INSERT INTO public.transactions (
        business_id, type, category, amount, description, tx_date
      )
      VALUES (
        NEW.business_id,
        'expense',
        'Compras',
        NEW.total,
        'Compra: ' || COALESCE(NEW.supplier_name, 'Proveedor'),
        NEW.purchase_date
      )
      RETURNING id INTO tx_id;

      NEW.transaction_id := tx_id;
    END IF;

    NEW.stock_applied := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_sale_effects ON public.sales;
DROP TRIGGER IF EXISTS trg_unapply_sale_on_cancel ON public.sales;
CREATE TRIGGER trg_sync_sale_effects
  BEFORE INSERT OR UPDATE OF status, items, total, sale_date, customer_name, business_id
  ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_sale_effects();

DROP TRIGGER IF EXISTS trg_apply_purchase_effects ON public.purchases;
CREATE TRIGGER trg_sync_purchase_effects
  BEFORE INSERT OR UPDATE OF status, items, total, purchase_date, supplier_name, business_id
  ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_purchase_effects();
