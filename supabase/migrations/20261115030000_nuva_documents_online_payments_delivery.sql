-- Nüva Documents: online payment reconciliation and auditable email delivery.
-- Online collection reuses the business's existing encrypted Flow credentials.
-- The browser never marks an invoice as paid; only the provider status check does.

ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS checkout_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payment_intents_one_pending_invoice_idx
  ON public.payment_intents(invoice_id)
  WHERE invoice_id IS NOT NULL AND status = 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.payment_intents'::regclass
      AND conname = 'payment_intents_sale_or_invoice_check'
  ) THEN
    ALTER TABLE public.payment_intents
      ADD CONSTRAINT payment_intents_sale_or_invoice_check
      CHECK (sale_id IS NULL OR invoice_id IS NULL);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_events_provider_token_unique
  ON public.payment_webhook_events(provider, token);

CREATE INDEX IF NOT EXISTS payment_intents_invoice_pending_idx
  ON public.payment_intents(invoice_id, created_at DESC)
  WHERE invoice_id IS NOT NULL AND status = 'pending';

CREATE TABLE IF NOT EXISTS public.document_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('quote','internal_invoice')),
  document_id UUID NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel = 'email'),
  provider TEXT NOT NULL DEFAULT 'resend' CHECK (provider = 'resend'),
  recipient TEXT NOT NULL CHECK (length(recipient) BETWEEN 3 AND 254),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed')),
  idempotency_key TEXT NOT NULL,
  provider_message_id TEXT,
  error_code TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT document_delivery_attempts_business_idempotency_unique UNIQUE (business_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS document_delivery_attempts_business_created_idx
  ON public.document_delivery_attempts(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS document_delivery_attempts_retry_idx
  ON public.document_delivery_attempts(status, created_at)
  WHERE status IN ('queued','failed');

ALTER TABLE public.document_delivery_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_delivery_attempts_member_select ON public.document_delivery_attempts;
CREATE POLICY document_delivery_attempts_member_select
  ON public.document_delivery_attempts
  FOR SELECT TO authenticated
  USING ((SELECT private.is_business_member(business_id, (SELECT auth.uid()))));

REVOKE ALL ON public.document_delivery_attempts FROM anon, authenticated;
GRANT SELECT ON public.document_delivery_attempts TO authenticated;

CREATE OR REPLACE FUNCTION public.record_provider_internal_invoice_payment(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_provider TEXT,
  p_provider_reference TEXT,
  p_commerce_order TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_existing public.invoice_payments%ROWTYPE;
  v_payment_id UUID;
  v_transaction_id UUID;
  v_paid NUMERIC(14,2);
  v_remaining NUMERIC(14,2);
  v_new_status TEXT;
  v_idempotency_key TEXT;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Operación reservada al servicio de pagos';
  END IF;
  IF p_provider NOT IN ('flow','vsb') OR length(trim(COALESCE(p_provider_reference,''))) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'Referencia de proveedor inválida';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 0) THEN
    RAISE EXCEPTION 'El pago debe ser un importe positivo en pesos enteros';
  END IF;

  SELECT i.* INTO v_invoice FROM public.invoices i WHERE i.id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento no encontrado'; END IF;
  IF v_invoice.status NOT IN ('issued','partially_paid','overdue') THEN
    RAISE EXCEPTION 'El documento no está habilitado para recibir pagos';
  END IF;
  IF p_amount > v_invoice.total THEN RAISE EXCEPTION 'El pago supera el total del documento'; END IF;

  v_idempotency_key := 'provider:' || p_provider || ':' || p_provider_reference;
  SELECT p.* INTO v_existing FROM public.invoice_payments p
  WHERE p.business_id = v_invoice.business_id AND p.idempotency_key = v_idempotency_key;
  IF FOUND THEN
    IF v_existing.invoice_id <> p_invoice_id OR v_existing.amount <> p_amount THEN
      RAISE EXCEPTION 'La referencia del proveedor ya fue utilizada para otra operación';
    END IF;
    RETURN v_existing.id;
  END IF;

  SELECT COALESCE(SUM(p.amount),0) INTO v_paid
  FROM public.invoice_payments p
  WHERE p.invoice_id = p_invoice_id AND p.status = 'confirmed';
  v_remaining := v_invoice.total - v_paid;
  IF p_amount > v_remaining THEN RAISE EXCEPTION 'El pago supera el saldo pendiente'; END IF;

  INSERT INTO public.invoice_payments (
    business_id, invoice_id, amount, payment_method, payment_reference,
    idempotency_key, status, source, recorded_by
  ) VALUES (
    v_invoice.business_id, p_invoice_id, p_amount, p_provider,
    p_provider_reference, v_idempotency_key, 'confirmed', 'provider', NULL
  ) RETURNING id INTO v_payment_id;

  INSERT INTO public.transactions (business_id, type, category, amount, description, tx_date)
  VALUES (
    v_invoice.business_id, 'income', 'Cobros de documentos', p_amount,
    'Pago online ' || p_provider || ' documento interno '
      || lpad(v_invoice.invoice_number::text, 6, '0') || ' · ' || v_invoice.customer_name,
    CURRENT_DATE
  ) RETURNING id INTO v_transaction_id;

  UPDATE public.invoice_payments SET transaction_id = v_transaction_id WHERE id = v_payment_id;
  v_paid := v_paid + p_amount;
  v_new_status := CASE WHEN v_paid >= v_invoice.total THEN 'paid' ELSE 'partially_paid' END;

  UPDATE public.invoices
  SET status = v_new_status,
      paid_at = CASE WHEN v_new_status = 'paid' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_invoice_id;

  INSERT INTO public.invoice_events (business_id, invoice_id, event_type, event_data, actor_id)
  VALUES (
    v_invoice.business_id, p_invoice_id, 'payment_recorded',
    jsonb_build_object(
      'payment_id', v_payment_id,
      'transaction_id', v_transaction_id,
      'amount', p_amount,
      'provider', p_provider,
      'provider_reference', p_provider_reference,
      'commerce_order', p_commerce_order,
      'paid_total', v_paid,
      'remaining', v_invoice.total - v_paid
    ),
    NULL
  );

  RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_provider_internal_invoice_payment(UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_provider_internal_invoice_payment(UUID, NUMERIC, TEXT, TEXT, TEXT) TO service_role;

-- Any confirmed payment invalidates outstanding checkout links for that invoice.
-- This prevents a customer from paying an old full-balance link after a manual
-- or partial payment has already reduced the balance.
CREATE OR REPLACE FUNCTION private.expire_pending_invoice_payment_intents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $
BEGIN
  IF NEW.status = 'confirmed' THEN
    UPDATE public.payment_intents
    SET status = 'expired'
    WHERE invoice_id = NEW.invoice_id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS invoice_payments_expire_pending_checkout ON public.invoice_payments;
CREATE TRIGGER invoice_payments_expire_pending_checkout
AFTER INSERT OR UPDATE OF status ON public.invoice_payments
FOR EACH ROW
WHEN (NEW.status = 'confirmed')
EXECUTE FUNCTION private.expire_pending_invoice_payment_intents();

REVOKE ALL ON FUNCTION private.expire_pending_invoice_payment_intents() FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE public.document_delivery_attempts IS
  'Auditable email delivery attempts for Nüva commercial documents; a sent state means accepted by provider, not guaranteed inbox placement.';
