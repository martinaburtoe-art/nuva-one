-- Atomic payment settlement + distributed inventory idempotency.
-- Additive migration only. Never applied to production in this change.

BEGIN;

-- Keep the provider redirect alongside the intent so a retry after a lost
-- HTTP response can return the original link without creating another charge.
ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS payment_url text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payment_intents
    GROUP BY provider, commerce_order
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce unique payment commerce orders: duplicates already exist';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_intents_provider_commerce_order
  ON public.payment_intents(provider, commerce_order);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_intent_id uuid
  REFERENCES public.payment_intents(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payments
    WHERE payment_intent_id IS NOT NULL
    GROUP BY payment_intent_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one payment per intent: duplicate payment_intent_id values exist';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_payment_intent_id
  ON public.payments(payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;

-- A request is claimed before contacting an external provider. A request
-- left in 'creating' or 'recovery_required' is never sent to the provider
-- again automatically; this is safer than creating a duplicate external
-- charge after an ambiguous network/database failure.
CREATE TABLE IF NOT EXISTS public.payment_creation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('flow', 'vsb')),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 128),
  commerce_order text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'creating'
    CHECK (status IN ('creating', 'created', 'recovery_required', 'closed')),
  payment_intent_id uuid REFERENCES public.payment_intents(id) ON DELETE RESTRICT,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_creation_requests_business_key UNIQUE (business_id, idempotency_key),
  CONSTRAINT payment_creation_requests_provider_order UNIQUE (provider, commerce_order),
  CONSTRAINT payment_creation_requests_created_has_intent
    CHECK (status NOT IN ('created', 'closed') OR payment_intent_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_creation_requests_active_sale
  ON public.payment_creation_requests(business_id, sale_id)
  WHERE sale_id IS NOT NULL AND status IN ('creating', 'created', 'recovery_required');

ALTER TABLE public.payment_creation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_creation_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.payment_creation_requests TO service_role;

-- Caller-keyed manual/scanner adjustments are unique per product/source.
-- Sales and purchases have separate lifecycle state machines and can legitimately
-- emit multiple movements per document/product across edits and reversals.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.inventory_movements
    WHERE source_type IS NOT NULL
      AND source_id IS NOT NULL
      AND source_type NOT IN ('sale', 'sale_reversal', 'purchase', 'purchase_reversal', 'product_initial_stock')
    GROUP BY business_id, product_id, source_type, source_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce inventory source idempotency: duplicate movement source keys exist';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_adjustments_source_product
  ON public.inventory_movements(business_id, product_id, source_type, source_id)
  WHERE source_type IS NOT NULL
    AND source_id IS NOT NULL
    AND source_type NOT IN ('sale', 'sale_reversal', 'purchase', 'purchase_reversal', 'product_initial_stock');

-- Preserve the existing role check, row lock and stock floor while making a
-- repeated source key a read-only replay of the original movement.
CREATE OR REPLACE FUNCTION private.adjust_product_stock(
  p_product_id uuid,
  p_delta integer,
  p_reason text DEFAULT 'Ajuste manual',
  p_source_type text DEFAULT 'manual_adjustment',
  p_source_id uuid DEFAULT NULL
)
RETURNS TABLE(product_id uuid, stock_before integer, stock_after integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_business_id uuid;
  v_before integer;
  v_after integer;
  v_existing public.inventory_movements%ROWTYPE;
  v_reason text := NULLIF(trim(p_reason), '');
BEGIN
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'El ajuste de stock no puede ser cero'
      USING ERRCODE = '22023';
  END IF;

  SELECT p.business_id, p.stock
    INTO v_business_id, v_before
    FROM public.products p
   WHERE p.id = p_product_id
   FOR UPDATE;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF NOT private.has_business_role(
    v_business_id,
    (select auth.uid()),
    ARRAY['owner'::public.member_role, 'admin'::public.member_role, 'staff'::public.member_role]
  ) THEN
    RAISE EXCEPTION 'Sin permisos para ajustar inventario'
      USING ERRCODE = '42501';
  END IF;

  IF p_source_type IS NOT NULL
     AND p_source_id IS NOT NULL
     AND p_source_type NOT IN ('sale', 'sale_reversal', 'purchase', 'purchase_reversal', 'product_initial_stock') THEN
    SELECT m.*
      INTO v_existing
      FROM public.inventory_movements m
     WHERE m.business_id = v_business_id
       AND m.product_id = p_product_id
       AND m.source_type = p_source_type
       AND m.source_id = p_source_id
     LIMIT 1;

    IF FOUND THEN
      IF v_existing.quantity_delta IS DISTINCT FROM p_delta::numeric
         OR v_existing.reason IS DISTINCT FROM v_reason
         OR v_existing.movement_type IS DISTINCT FROM 'adjustment' THEN
        RAISE EXCEPTION 'La clave de origen ya fue utilizada con un ajuste diferente'
          USING ERRCODE = '23505';
      END IF;

      RETURN QUERY
        SELECT p_product_id, v_existing.stock_before, v_existing.stock_after;
      RETURN;
    END IF;
  END IF;

  v_after := v_before + p_delta;
  IF v_after < 0 THEN
    RAISE EXCEPTION 'El ajuste dejaría el stock en negativo'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.products
     SET stock = v_after
   WHERE id = p_product_id;

  INSERT INTO public.inventory_movements (
    business_id, product_id, quantity_delta, stock_before, stock_after,
    movement_type, reason, source_type, source_id, created_by
  )
  VALUES (
    v_business_id, p_product_id, p_delta, v_before, v_after,
    'adjustment', v_reason, p_source_type, p_source_id, (select auth.uid())
  );

  RETURN QUERY SELECT p_product_id, v_before, v_after;
END;
$function$;

-- Purchase stock effects have their own lifecycle key (purchases.stock_applied).
-- Keep that state machine atomic, record every apply/reversal, and reject a
-- cancellation/edit when the purchased quantity has already been consumed.
CREATE OR REPLACE FUNCTION public.sync_purchase_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  item jsonb;
  tx_id uuid;
  v_product_id uuid;
  v_qty integer;
  v_before integer;
  v_after integer;
  old_effect_must_be_reverted boolean := false;
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
          v_product_id := (item->>'product_id')::uuid;
          v_qty := COALESCE((item->>'qty')::integer, 0);
          IF v_qty <= 0 THEN
            RAISE EXCEPTION 'La cantidad comprada debe ser mayor que cero'
              USING ERRCODE = '22023';
          END IF;

          SELECT p.stock
            INTO v_before
            FROM public.products p
           WHERE p.id = v_product_id
             AND p.business_id = OLD.business_id
           FOR UPDATE;

          IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto de compra no encontrado en el negocio'
              USING ERRCODE = '23503';
          END IF;
          IF v_before < v_qty THEN
            RAISE EXCEPTION 'No es posible revertir compra: stock insuficiente'
              USING ERRCODE = '23514';
          END IF;

          v_after := v_before - v_qty;
          UPDATE public.products SET stock = v_after WHERE id = v_product_id;

          INSERT INTO public.inventory_movements (
            business_id, product_id, quantity_delta, stock_before, stock_after,
            movement_type, reason, source_type, source_id
          )
          VALUES (
            OLD.business_id, v_product_id, -v_qty, v_before, v_after,
            'purchase_reversal', 'Reversión de compra', 'purchase_reversal', OLD.id
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
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      IF NULLIF(item->>'product_id', '') IS NOT NULL THEN
        v_product_id := (item->>'product_id')::uuid;
        v_qty := COALESCE((item->>'qty')::integer, 0);
        IF v_qty <= 0 THEN
          RAISE EXCEPTION 'La cantidad comprada debe ser mayor que cero'
            USING ERRCODE = '22023';
        END IF;

        SELECT p.stock
          INTO v_before
          FROM public.products p
         WHERE p.id = v_product_id
           AND p.business_id = NEW.business_id
         FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Producto de compra no encontrado en el negocio'
            USING ERRCODE = '23503';
        END IF;

        v_after := v_before + v_qty;
        UPDATE public.products SET stock = v_after WHERE id = v_product_id;

        INSERT INTO public.inventory_movements (
          business_id, product_id, quantity_delta, stock_before, stock_after,
          movement_type, reason, source_type, source_id
        )
        VALUES (
          NEW.business_id, v_product_id, v_qty, v_before, v_after,
          'purchase', 'Entrada por compra', 'purchase', NEW.id
        );
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
$function$;

-- The only settlement entry point is service-role-only. Provider verification
-- happens in the server handler; this function revalidates amount/order and
-- atomically writes payment, sale balance, intent status and webhook receipt.
CREATE OR REPLACE FUNCTION public.settle_payment_intent(
  p_provider text,
  p_token text,
  p_provider_status text,
  p_provider_amount numeric DEFAULT NULL,
  p_provider_commerce_order text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $function$
DECLARE
  v_event public.payment_webhook_events%ROWTYPE;
  v_intent public.payment_intents%ROWTYPE;
  v_sale public.sales%ROWTYPE;
  v_payment_id uuid;
  v_remaining numeric(12,2);
  v_active_request_id uuid;
  v_active_intent_id uuid;
  v_recovery_reason text;
BEGIN
  IF NULLIF(trim(p_provider), '') IS NULL OR NULLIF(trim(p_token), '') IS NULL THEN
    RAISE EXCEPTION 'Proveedor y token son obligatorios' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.payment_webhook_events(provider, token)
  VALUES (p_provider, p_token)
  ON CONFLICT DO NOTHING;

  SELECT e.*
    INTO v_event
    FROM public.payment_webhook_events e
   WHERE e.provider = p_provider
     AND e.token = p_token
   FOR UPDATE;

  SELECT i.*
    INTO v_intent
    FROM public.payment_intents i
   WHERE i.provider = p_provider
     AND i.token = p_token
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'unknown_token');
  END IF;

  -- Terminal intents are rechecked even after a processed rejection so a
  -- late provider confirmation cannot be silently ignored.
  IF v_event.processed AND v_intent.status NOT IN ('rejected', 'expired') THEN
    RETURN jsonb_build_object('outcome', 'already_processed');
  END IF;

  IF v_intent.status = 'paid' THEN
    UPDATE public.payment_creation_requests
       SET status = 'closed',
           payment_intent_id = v_intent.id,
           updated_at = now()
     WHERE provider = v_intent.provider
       AND commerce_order = v_intent.commerce_order
       AND status <> 'closed';
    UPDATE public.payment_webhook_events SET processed = true WHERE id = v_event.id;
    RETURN jsonb_build_object('outcome', 'already_paid', 'intent_id', v_intent.id);
  END IF;

  IF v_intent.status IN ('rejected', 'expired') THEN
    IF p_provider_status IS NULL OR p_provider_status NOT IN ('rejected', 'expired') THEN
      v_recovery_reason := CASE
        WHEN p_provider_status = 'paid' THEN 'late_paid_after_terminal'
        ELSE 'terminal_provider_state_unconfirmed'
      END;

      -- Keep the original attempt for audit, but quarantine any newer active
      -- attempt for the same sale to avoid two links remaining collectible.
      UPDATE public.payment_creation_requests
         SET last_error = v_recovery_reason,
             updated_at = now()
       WHERE provider = v_intent.provider
         AND commerce_order = v_intent.commerce_order;

      v_active_request_id := NULL;
      v_active_intent_id := NULL;
      IF v_intent.sale_id IS NOT NULL THEN
        SELECT r.id, r.payment_intent_id
          INTO v_active_request_id, v_active_intent_id
          FROM public.payment_creation_requests r
         WHERE r.sale_id = v_intent.sale_id
           AND r.status IN ('creating', 'created', 'recovery_required')
         ORDER BY r.created_at DESC
         LIMIT 1
         FOR UPDATE;
      END IF;

      IF v_active_request_id IS NOT NULL THEN
        UPDATE public.payment_creation_requests
           SET status = 'recovery_required',
               last_error = v_recovery_reason || ':' || v_intent.commerce_order,
               updated_at = now()
         WHERE id = v_active_request_id;

        IF v_active_intent_id IS NOT NULL AND v_active_intent_id <> v_intent.id THEN
          UPDATE public.payment_intents
             SET status = 'expired',
                 resolved_at = COALESCE(resolved_at, now())
           WHERE id = v_active_intent_id
             AND status = 'pending';
        END IF;
      ELSE
        UPDATE public.payment_creation_requests
           SET status = 'recovery_required',
               payment_intent_id = v_intent.id,
               last_error = v_recovery_reason,
               updated_at = now()
         WHERE provider = v_intent.provider
           AND commerce_order = v_intent.commerce_order;
      END IF;

      IF p_provider_status = 'paid' THEN
        UPDATE public.payment_webhook_events SET processed = true WHERE id = v_event.id;
        RETURN jsonb_build_object('outcome', 'late_paid_after_terminal', 'intent_id', v_intent.id);
      END IF;

      RETURN jsonb_build_object('outcome', 'terminal_provider_state_unconfirmed', 'intent_id', v_intent.id);
    END IF;

    UPDATE public.payment_creation_requests
       SET status = 'closed',
           payment_intent_id = v_intent.id,
           updated_at = now()
     WHERE provider = v_intent.provider
       AND commerce_order = v_intent.commerce_order
       AND status <> 'closed'
       AND COALESCE(last_error, '') NOT LIKE 'late_paid_after_terminal%'
       AND COALESCE(last_error, '') NOT LIKE 'terminal_provider_state_unconfirmed%';
    UPDATE public.payment_webhook_events SET processed = true WHERE id = v_event.id;
    RETURN jsonb_build_object('outcome', 'terminal_state', 'intent_id', v_intent.id);
  END IF;

  IF p_provider_status = 'pending' THEN
    RETURN jsonb_build_object('outcome', 'resolved_pending', 'intent_id', v_intent.id);
  END IF;

  IF p_provider_status = 'rejected' THEN
    UPDATE public.payment_intents
       SET status = 'rejected',
           resolved_at = COALESCE(resolved_at, now())
     WHERE id = v_intent.id;
    UPDATE public.payment_creation_requests
       SET status = 'closed',
           payment_intent_id = v_intent.id,
           updated_at = now()
     WHERE provider = v_intent.provider
       AND commerce_order = v_intent.commerce_order
       AND status <> 'closed';
    UPDATE public.payment_webhook_events SET processed = true WHERE id = v_event.id;
    RETURN jsonb_build_object('outcome', 'resolved_rejected', 'intent_id', v_intent.id);
  END IF;

  IF p_provider_status <> 'paid' THEN
    RETURN jsonb_build_object('outcome', 'provider_status_unresolved', 'intent_id', v_intent.id);
  END IF;

  IF p_provider_amount IS NULL
     OR p_provider_amount IS DISTINCT FROM v_intent.amount
     OR p_provider_commerce_order IS NULL
     OR p_provider_commerce_order IS DISTINCT FROM v_intent.commerce_order THEN
    UPDATE public.payment_creation_requests
       SET status = 'recovery_required',
           payment_intent_id = v_intent.id,
           last_error = 'provider_mismatch',
           updated_at = now()
     WHERE provider = v_intent.provider
       AND commerce_order = v_intent.commerce_order
       AND status <> 'closed';
    UPDATE public.payment_webhook_events SET processed = true WHERE id = v_event.id;
    RETURN jsonb_build_object('outcome', 'provider_mismatch', 'intent_id', v_intent.id);
  END IF;

  IF v_intent.sale_id IS NOT NULL THEN
    SELECT s.*
      INTO v_sale
      FROM public.sales s
     WHERE s.id = v_intent.sale_id
       AND s.business_id = v_intent.business_id
     FOR UPDATE;

    IF NOT FOUND THEN
      UPDATE public.payment_creation_requests
         SET status = 'recovery_required',
             payment_intent_id = v_intent.id,
             last_error = 'sale_not_found',
             updated_at = now()
       WHERE provider = v_intent.provider
         AND commerce_order = v_intent.commerce_order
         AND status <> 'closed';
      UPDATE public.payment_webhook_events SET processed = true WHERE id = v_event.id;
      RETURN jsonb_build_object('outcome', 'sale_not_found', 'intent_id', v_intent.id);
    END IF;

    IF v_sale.status IN ('draft', 'cancelled') THEN
      UPDATE public.payment_creation_requests
         SET status = 'recovery_required',
             payment_intent_id = v_intent.id,
             last_error = 'sale_not_collectible',
             updated_at = now()
       WHERE provider = v_intent.provider
         AND commerce_order = v_intent.commerce_order
         AND status <> 'closed';
      UPDATE public.payment_webhook_events SET processed = true WHERE id = v_event.id;
      RETURN jsonb_build_object('outcome', 'sale_not_collectible', 'intent_id', v_intent.id);
    END IF;

    v_remaining := COALESCE(v_sale.total, 0) - COALESCE(v_sale.paid_amount, 0);
    IF v_remaining <= 0 OR v_intent.amount > v_remaining THEN
      UPDATE public.payment_creation_requests
         SET status = 'recovery_required',
             payment_intent_id = v_intent.id,
             last_error = 'sale_balance_exceeded',
             updated_at = now()
       WHERE provider = v_intent.provider
         AND commerce_order = v_intent.commerce_order
         AND status <> 'closed';
      UPDATE public.payment_webhook_events SET processed = true WHERE id = v_event.id;
      RETURN jsonb_build_object(
        'outcome', 'sale_balance_exceeded',
        'intent_id', v_intent.id,
        'remaining', GREATEST(v_remaining, 0)
      );
    END IF;

    SELECT p.id
      INTO v_payment_id
      FROM public.payments p
     WHERE p.payment_intent_id = v_intent.id
     LIMIT 1;

    IF v_payment_id IS NULL THEN
      INSERT INTO public.payments (
        payment_intent_id, business_id, sale_id, amount, method
      )
      VALUES (
        v_intent.id, v_intent.business_id, v_intent.sale_id,
        v_intent.amount, v_intent.provider
      )
      RETURNING id INTO v_payment_id;
    END IF;
  END IF;

  UPDATE public.payment_intents
     SET status = 'paid',
         resolved_at = COALESCE(resolved_at, now())
   WHERE id = v_intent.id;

  UPDATE public.payment_creation_requests
     SET status = 'closed',
         payment_intent_id = v_intent.id,
         updated_at = now()
   WHERE provider = v_intent.provider
     AND commerce_order = v_intent.commerce_order
     AND status <> 'closed';

  UPDATE public.payment_webhook_events SET processed = true WHERE id = v_event.id;

  RETURN jsonb_build_object(
    'outcome', 'resolved_paid',
    'intent_id', v_intent.id,
    'payment_id', v_payment_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.settle_payment_intent(text, text, text, numeric, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_payment_intent(text, text, text, numeric, text)
  TO service_role;

COMMIT;
