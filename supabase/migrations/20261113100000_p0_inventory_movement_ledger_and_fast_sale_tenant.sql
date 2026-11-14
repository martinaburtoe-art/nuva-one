-- P0 correctness: preserve a complete stock movement trail and bind fast sales
-- to the business selected by the authenticated user.
--
-- This migration is additive to the existing lifecycle trigger contract. It does not
-- rewrite historical movements or alter stock balances outside normal row events.

CREATE OR REPLACE FUNCTION public.sync_sale_effects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, extensions
AS $$
DECLARE
  item JSONB;
  tx_id UUID;
  qty_needed INTEGER;
  product_name TEXT;
  product_id UUID;
  stock_before INTEGER;
  stock_after INTEGER;
  reserved_qty INTEGER;
  blocked_qty INTEGER;
  old_effect_must_be_reverted BOOLEAN := false;
BEGIN
  -- Revert the previously applied sale effect before applying a changed version.
  IF TG_OP = 'UPDATE' AND OLD.stock_applied THEN
    old_effect_must_be_reverted :=
      OLD.business_id IS DISTINCT FROM NEW.business_id
      OR OLD.status IS DISTINCT FROM NEW.status
      OR OLD.items IS DISTINCT FROM NEW.items
      OR OLD.total IS DISTINCT FROM NEW.total
      OR OLD.sale_date IS DISTINCT FROM NEW.sale_date
      OR OLD.customer_name IS DISTINCT FROM NEW.customer_name;

    IF old_effect_must_be_reverted THEN
      FOR item IN
        SELECT value FROM jsonb_array_elements(COALESCE(OLD.items, '[]'::jsonb))
      LOOP
        IF NULLIF(item->>'product_id', '') IS NOT NULL THEN
          product_id := (item->>'product_id')::UUID;
          qty_needed := COALESCE((item->>'qty')::INTEGER, 0);
          IF qty_needed <= 0 THEN
            RAISE EXCEPTION 'SALE_REVERSAL_ITEM_QUANTITY_INVALID'
              USING ERRCODE = '22023';
          END IF;

          SELECT p.stock
            INTO stock_before
          FROM public.products AS p
          WHERE p.id = product_id
            AND p.business_id = OLD.business_id
          FOR UPDATE;

          IF NOT FOUND THEN
            RAISE EXCEPTION 'SALE_REVERSAL_PRODUCT_NOT_FOUND'
              USING ERRCODE = '23503';
          END IF;

          UPDATE public.products
          SET stock = stock_before + qty_needed
          WHERE id = product_id
            AND business_id = OLD.business_id
          RETURNING stock INTO stock_after;

          INSERT INTO public.inventory_movements (
            business_id, product_id, quantity_delta, stock_before, stock_after,
            movement_type, reason, source_type, source_id, created_by
          ) VALUES (
            OLD.business_id, product_id, qty_needed, stock_before, stock_after,
            'sale_reversal', 'Reversión de venta por cambio de estado o contenido',
            'sale_reversal', OLD.id, auth.uid()
          );
        END IF;
      END LOOP;

      IF OLD.transaction_id IS NOT NULL THEN
        DELETE FROM public.transactions WHERE id = OLD.transaction_id;
      END IF;

      NEW.stock_applied := false;
      NEW.transaction_id := NULL;
    END IF;
  END IF;

  -- Apply the new sale version. Validate available stock here because this
  -- trigger runs before the separate validation trigger alphabetically.
  IF NEW.status IN ('paid', 'pending') AND NOT NEW.stock_applied THEN
    FOR item IN
      SELECT value FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      IF NULLIF(item->>'product_id', '') IS NOT NULL THEN
        product_id := (item->>'product_id')::UUID;
        qty_needed := COALESCE((item->>'qty')::INTEGER, 0);

        IF qty_needed <= 0 THEN
          RAISE EXCEPTION 'SALE_ITEM_QUANTITY_INVALID'
            USING ERRCODE = '22023';
        END IF;

        SELECT p.stock, p.reserved_stock, p.blocked_stock, p.name
          INTO stock_before, reserved_qty, blocked_qty, product_name
        FROM public.products AS p
        WHERE p.id = product_id
          AND p.business_id = NEW.business_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'SALE_PRODUCT_NOT_FOUND'
            USING ERRCODE = '23503';
        END IF;

        IF GREATEST(0, stock_before - reserved_qty - blocked_qty) < qty_needed THEN
          RAISE EXCEPTION 'Stock disponible insuficiente para "%": no hay % unidades disponibles',
            COALESCE(product_name, item->>'name'), qty_needed
            USING ERRCODE = 'check_violation';
        END IF;

        UPDATE public.products
        SET stock = stock_before - qty_needed
        WHERE id = product_id
          AND business_id = NEW.business_id
        RETURNING stock INTO stock_after;

        INSERT INTO public.inventory_movements (
          business_id, product_id, quantity_delta, stock_before, stock_after,
          movement_type, reason, source_type, source_id, created_by
        ) VALUES (
          NEW.business_id, product_id, -qty_needed, stock_before, stock_after,
          'sale', 'Salida por venta', 'sale', NEW.id, auth.uid()
        );
      END IF;
    END LOOP;

    IF NEW.transaction_id IS NULL AND NEW.total > 0 THEN
      INSERT INTO public.transactions (
        business_id, type, category, amount, description, tx_date
      ) VALUES (
        NEW.business_id, 'income', 'Ventas', NEW.total,
        'Venta: ' || COALESCE(NEW.customer_name, 'Cliente'), NEW.sale_date
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
SET search_path = pg_catalog, public, private, extensions
AS $$
DECLARE
  item JSONB;
  tx_id UUID;
  qty_needed INTEGER;
  product_id UUID;
  stock_before INTEGER;
  stock_after INTEGER;
  old_effect_must_be_reverted BOOLEAN := false;
BEGIN
  -- Revert the previous receipt as a compensating ledger entry. Never clamp
  -- stock to zero: if the goods have already been consumed, reject the edit
  -- and preserve the previous, internally consistent state.
  IF TG_OP = 'UPDATE' AND OLD.stock_applied THEN
    old_effect_must_be_reverted :=
      OLD.business_id IS DISTINCT FROM NEW.business_id
      OR OLD.status IS DISTINCT FROM NEW.status
      OR OLD.items IS DISTINCT FROM NEW.items
      OR OLD.total IS DISTINCT FROM NEW.total
      OR OLD.purchase_date IS DISTINCT FROM NEW.purchase_date
      OR OLD.supplier_name IS DISTINCT FROM NEW.supplier_name;

    IF old_effect_must_be_reverted THEN
      FOR item IN
        SELECT value FROM jsonb_array_elements(COALESCE(OLD.items, '[]'::jsonb))
      LOOP
        IF NULLIF(item->>'product_id', '') IS NOT NULL THEN
          product_id := (item->>'product_id')::UUID;
          qty_needed := COALESCE((item->>'qty')::INTEGER, 0);
          IF qty_needed <= 0 THEN
            RAISE EXCEPTION 'PURCHASE_REVERSAL_ITEM_QUANTITY_INVALID'
              USING ERRCODE = '22023';
          END IF;

          SELECT p.stock
            INTO stock_before
          FROM public.products AS p
          WHERE p.id = product_id
            AND p.business_id = OLD.business_id
          FOR UPDATE;

          IF NOT FOUND THEN
            RAISE EXCEPTION 'PURCHASE_REVERSAL_PRODUCT_NOT_FOUND'
              USING ERRCODE = '23503';
          END IF;

          IF stock_before < qty_needed THEN
            RAISE EXCEPTION 'PURCHASE_REVERSAL_STOCK_INSUFFICIENT:%:%',
              product_id, stock_before
              USING ERRCODE = 'check_violation';
          END IF;

          UPDATE public.products
          SET stock = stock_before - qty_needed
          WHERE id = product_id
            AND business_id = OLD.business_id
          RETURNING stock INTO stock_after;

          INSERT INTO public.inventory_movements (
            business_id, product_id, quantity_delta, stock_before, stock_after,
            movement_type, reason, source_type, source_id, created_by
          ) VALUES (
            OLD.business_id, product_id, -qty_needed, stock_before, stock_after,
            'purchase_reversal', 'Reversión de recepción por cambio de estado o contenido',
            'purchase_reversal', OLD.id, auth.uid()
          );
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
    FOR item IN
      SELECT value FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      IF NULLIF(item->>'product_id', '') IS NOT NULL THEN
        product_id := (item->>'product_id')::UUID;
        qty_needed := COALESCE((item->>'qty')::INTEGER, 0);

        IF qty_needed <= 0 THEN
          RAISE EXCEPTION 'PURCHASE_ITEM_QUANTITY_INVALID'
            USING ERRCODE = '22023';
        END IF;

        SELECT p.stock
          INTO stock_before
        FROM public.products AS p
        WHERE p.id = product_id
          AND p.business_id = NEW.business_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'PURCHASE_PRODUCT_NOT_FOUND'
            USING ERRCODE = '23503';
        END IF;

        UPDATE public.products
        SET stock = stock_before + qty_needed
        WHERE id = product_id
          AND business_id = NEW.business_id
        RETURNING stock INTO stock_after;

        INSERT INTO public.inventory_movements (
          business_id, product_id, quantity_delta, stock_before, stock_after,
          movement_type, reason, source_type, source_id, created_by
        ) VALUES (
          NEW.business_id, product_id, qty_needed, stock_before, stock_after,
          'purchase', 'Entrada por compra', 'purchase', NEW.id, auth.uid()
        );
      END IF;
    END LOOP;

    IF NEW.transaction_id IS NULL AND NEW.total > 0 THEN
      INSERT INTO public.transactions (
        business_id, type, category, amount, description, tx_date
      ) VALUES (
        NEW.business_id, 'expense', 'Compras', NEW.total,
        'Compra: ' || COALESCE(NEW.supplier_name, 'Proveedor'), NEW.purchase_date
      )
      RETURNING id INTO tx_id;

      NEW.transaction_id := tx_id;
    END IF;

    NEW.stock_applied := true;
  END IF;

  RETURN NEW;
END;
$$;

-- New contract: the caller must name the selected business explicitly.
-- Membership and operational role are re-checked server-side for that exact tenant.
CREATE OR REPLACE FUNCTION public.create_fast_sale(
  p_business_id UUID,
  p_customer_id UUID DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_channel TEXT DEFAULT 'tienda',
  p_payment_method TEXT DEFAULT 'efectivo',
  p_is_credit BOOLEAN DEFAULT false,
  p_due_date DATE DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private, extensions
AS $function$
DECLARE
  v_sale UUID;
  v_total NUMERIC(12,2) := 0;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_price NUMERIC(12,2);
  v_name TEXT;
  v_customer_business UUID;
  v_available INTEGER;
BEGIN
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'BUSINESS_CONTEXT_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS NULL OR NOT private.has_business_role(
    p_business_id,
    auth.uid(),
    ARRAY['owner','admin','staff']::public.member_role[]
  ) THEN
    RAISE EXCEPTION 'No tienes permisos operativos para el negocio seleccionado'
      USING ERRCODE = '42501';
  END IF;

  IF p_customer_id IS NOT NULL THEN
    SELECT c.business_id
      INTO v_customer_business
    FROM public.customers AS c
    WHERE c.id = p_customer_id;

    IF v_customer_business IS DISTINCT FROM p_business_id THEN
      RAISE EXCEPTION 'Cliente no pertenece al negocio seleccionado'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF p_is_credit AND p_customer_id IS NULL THEN
    RAISE EXCEPTION 'La venta a crédito requiere cliente' USING ERRCODE = '22023';
  END IF;
  IF p_is_credit AND p_due_date IS NULL THEN
    RAISE EXCEPTION 'La venta a crédito requiere vencimiento' USING ERRCODE = '22023';
  END IF;
  IF p_is_credit AND p_due_date < current_date THEN
    RAISE EXCEPTION 'La fecha de vencimiento no puede estar en el pasado'
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(COALESCE(p_items, '[]'::JSONB)) <> 'array'
     OR jsonb_array_length(COALESCE(p_items, '[]'::JSONB)) = 0 THEN
    RAISE EXCEPTION 'La venta requiere al menos un producto' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::UUID;
    v_qty := COALESCE((v_item->>'qty')::INTEGER, 0);

    IF v_product_id IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Producto/cantidad inválidos' USING ERRCODE = '22023';
    END IF;

    SELECT p.name, p.price,
           GREATEST(0, p.stock - p.reserved_stock - p.blocked_stock)
      INTO v_name, v_price, v_available
    FROM public.products AS p
    WHERE p.id = v_product_id
      AND p.business_id = p_business_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado' USING ERRCODE = 'P0001';
    END IF;

    IF v_available < v_qty THEN
      RAISE EXCEPTION 'Stock disponible insuficiente para %', v_name
        USING ERRCODE = 'check_violation';
    END IF;

    v_total := v_total + (v_price * v_qty);
  END LOOP;

  INSERT INTO public.sales (
    business_id, customer_id, customer_name, channel, payment_method, status,
    total, notes, items, is_credit, due_date, paid_amount, stock_applied, pos_reference
  )
  VALUES (
    p_business_id, p_customer_id, NULLIF(TRIM(p_customer_name), ''),
    LOWER(COALESCE(NULLIF(TRIM(p_channel), ''), 'tienda')),
    LOWER(COALESCE(NULLIF(TRIM(p_payment_method), ''), 'efectivo')),
    CASE WHEN p_is_credit THEN 'pending' ELSE 'paid' END,
    v_total, p_notes, p_items, p_is_credit, p_due_date,
    CASE WHEN p_is_credit THEN 0 ELSE v_total END,
    false,
    'NUVA-' || TO_CHAR(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' ||
      SUBSTR(gen_random_uuid()::TEXT, 1, 8)
  )
  RETURNING id INTO v_sale;

  RETURN v_sale;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_fast_sale(
  uuid, uuid, text, text, text, boolean, date, jsonb, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_fast_sale(
  uuid, uuid, text, text, text, boolean, date, jsonb, text
) TO authenticated;

-- Keep the old signature as a fail-closed compatibility shim. Cached clients
-- receive an explicit error instead of silently selecting another tenant.
CREATE OR REPLACE FUNCTION public.create_fast_sale(
  p_customer_id UUID DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_channel TEXT DEFAULT 'tienda',
  p_payment_method TEXT DEFAULT 'efectivo',
  p_is_credit BOOLEAN DEFAULT false,
  p_due_date DATE DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  RAISE EXCEPTION 'BUSINESS_CONTEXT_REQUIRED'
    USING ERRCODE = '22023',
          HINT = 'Update the client to send p_business_id.';
END;
$function$;

REVOKE ALL ON FUNCTION public.create_fast_sale(
  uuid, text, text, text, boolean, date, jsonb, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_fast_sale(
  uuid, text, text, text, boolean, date, jsonb, text
) TO authenticated;

COMMENT ON FUNCTION public.create_fast_sale(
  uuid, uuid, text, text, text, boolean, date, jsonb, text
) IS 'Creates a fast sale only for the explicitly selected business after server-side membership and operational-role verification.';

COMMENT ON FUNCTION public.create_fast_sale(
  uuid, text, text, text, boolean, date, jsonb, text
) IS 'Deprecated fail-closed compatibility shim. Clients must pass p_business_id.';
