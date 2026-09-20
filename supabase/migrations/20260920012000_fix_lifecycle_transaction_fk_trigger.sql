-- Complete the lifecycle fix: transaction_id uses ON DELETE SET NULL.
-- Deleting the generated transaction from a BEFORE UPDATE trigger would make
-- PostgreSQL update the same sale/purchase row through FK enforcement while
-- the outer UPDATE is still in progress, producing SQLSTATE 27000.
--
-- The BEFORE trigger now only reverses stock and clears NEW.transaction_id.
-- The AFTER trigger deletes the old generated transaction once the source row
-- update has completed.

CREATE OR REPLACE FUNCTION public.cleanup_sale_effect_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.transaction_id IS NOT NULL
     AND OLD.transaction_id IS DISTINCT FROM NEW.transaction_id THEN
    DELETE FROM public.transactions WHERE id = OLD.transaction_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_purchase_effect_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.transaction_id IS NOT NULL
     AND OLD.transaction_id IS DISTINCT FROM NEW.transaction_id THEN
    DELETE FROM public.transactions WHERE id = OLD.transaction_id;
  END IF;
  RETURN NEW;
END;
$$;

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

DROP TRIGGER IF EXISTS trg_cleanup_sale_effect_transaction ON public.sales;
CREATE TRIGGER trg_cleanup_sale_effect_transaction
  AFTER UPDATE OF status, items, total, sale_date, customer_name, business_id
  ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_sale_effect_transaction();

DROP TRIGGER IF EXISTS trg_cleanup_purchase_effect_transaction ON public.purchases;
CREATE TRIGGER trg_cleanup_purchase_effect_transaction
  AFTER UPDATE OF status, items, total, purchase_date, supplier_name, business_id
  ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_purchase_effect_transaction();
