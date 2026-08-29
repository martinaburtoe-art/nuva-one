-- Beta gate: make sale stock deduction atomic and race-safe.
-- PostgreSQL row-level locking on the conditional UPDATE serializes concurrent
-- sales for the same product. If enough stock is not available, no stock is
-- changed and the surrounding sale statement is aborted.

CREATE OR REPLACE FUNCTION public.apply_sale_effects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  tx_id UUID;
  requested_qty INTEGER;
  product_id UUID;
  product_name TEXT;
BEGIN
  IF NEW.status IN ('paid', 'pending') AND NOT NEW.stock_applied THEN
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      IF NULLIF(item->>'product_id', '') IS NOT NULL THEN
        product_id := (item->>'product_id')::uuid;
        requested_qty := COALESCE((item->>'qty')::integer, 0);
        product_name := COALESCE(NULLIF(item->>'name', ''), 'Producto');

        IF requested_qty <= 0 THEN
          RAISE EXCEPTION 'Cantidad inválida para "%": debe ser mayor que 0', product_name
            USING ERRCODE = 'check_violation';
        END IF;

        UPDATE public.products
        SET stock = stock - requested_qty
        WHERE id = product_id
          AND business_id = NEW.business_id
          AND stock >= requested_qty;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Stock insuficiente para "%": no hay % unidades disponibles', product_name, requested_qty
            USING ERRCODE = 'check_violation';
        END IF;
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
