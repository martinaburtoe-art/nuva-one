-- Nüva Documents: internal invoice lifecycle and auditable manual payment foundation.
-- This is NOT a Chilean SII DTE issuer. It creates internal commercial collection documents only.

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE RESTRICT,
  invoice_number BIGINT NOT NULL,
  document_kind TEXT NOT NULL DEFAULT 'internal_invoice' CHECK (document_kind = 'internal_invoice'),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','issued','partially_paid','paid','overdue','voided')),
  currency TEXT NOT NULL DEFAULT 'CLP' CHECK (currency = 'CLP'),
  customer_name TEXT NOT NULL,
  customer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(customer_snapshot) = 'object'),
  issuer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(issuer_snapshot) = 'object'),
  items_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items_snapshot) = 'array'),
  subject TEXT,
  subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_treatment TEXT NOT NULL CHECK (tax_treatment IN ('taxable','exempt','non_taxable')),
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 19 CHECK (vat_rate >= 0 AND vat_rate <= 100),
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total NUMERIC(14,2) NOT NULL CHECK (total >= 0),
  issued_at TIMESTAMPTZ,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  terms TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invoices_business_number_unique UNIQUE (business_id, invoice_number),
  CONSTRAINT invoices_quote_unique UNIQUE (quote_id),
  CONSTRAINT invoices_non_taxable_rate_check CHECK (tax_treatment = 'taxable' OR vat_rate = 0),
  CONSTRAINT invoices_paid_timestamp_check CHECK (status <> 'paid' OR paid_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS invoices_business_created_idx ON public.invoices (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_business_status_due_idx ON public.invoices (business_id, status, due_date);
CREATE INDEX IF NOT EXISTS invoices_customer_created_idx ON public.invoices (customer_id, created_at DESC) WHERE customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'CLP' CHECK (currency = 'CLP'),
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','voided','refunded')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','provider')),
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invoice_payments_business_idempotency_unique UNIQUE (business_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS invoice_payments_invoice_date_idx ON public.invoice_payments (invoice_id, confirmed_at DESC);

CREATE TABLE IF NOT EXISTS public.invoice_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('created_from_quote','issued','payment_recorded','payment_voided','marked_overdue','voided')),
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(event_data) = 'object'),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_events_timeline_idx ON public.invoice_events (invoice_id, created_at DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_member_select ON public.invoices;
CREATE POLICY invoices_member_select ON public.invoices
  FOR SELECT USING ((SELECT private.is_business_member(business_id, (SELECT auth.uid()))));

DROP POLICY IF EXISTS invoice_payments_member_select ON public.invoice_payments;
CREATE POLICY invoice_payments_member_select ON public.invoice_payments
  FOR SELECT USING ((SELECT private.is_business_member(business_id, (SELECT auth.uid()))));

DROP POLICY IF EXISTS invoice_events_member_select ON public.invoice_events;
CREATE POLICY invoice_events_member_select ON public.invoice_events
  FOR SELECT USING ((SELECT private.is_business_member(business_id, (SELECT auth.uid()))));

REVOKE INSERT, UPDATE, DELETE ON public.invoices FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.invoice_payments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.invoice_events FROM anon, authenticated;
GRANT SELECT ON public.invoices, public.invoice_payments, public.invoice_events TO authenticated;

CREATE OR REPLACE FUNCTION public.convert_accepted_quote_to_invoice(p_quote_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_invoice_id UUID;
  v_existing UUID;
  v_number BIGINT;
  v_discount NUMERIC(14,2);
  v_customer_snapshot JSONB;
  v_issuer_snapshot JSONB;
BEGIN
  SELECT q.* INTO v_quote
  FROM public.quotes q
  WHERE q.id = p_quote_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cotización no encontrada';
  END IF;

  IF NOT private.has_business_role(
    v_quote.business_id, auth.uid(),
    ARRAY['owner','admin','staff']::public.member_role[]
  ) THEN
    RAISE EXCEPTION 'Sin permisos para convertir esta cotización';
  END IF;

  SELECT i.id INTO v_existing
  FROM public.invoices i
  WHERE i.business_id = v_quote.business_id AND i.quote_id = p_quote_id;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  IF v_quote.status <> 'accepted' THEN
    RAISE EXCEPTION 'La cotización debe estar aceptada antes de emitir un documento de cobro';
  END IF;
  IF v_quote.price_basis IS NULL THEN
    RAISE EXCEPTION 'La cotización no tiene modalidad de precios validada';
  END IF;
  IF jsonb_typeof(v_quote.items) <> 'array' OR jsonb_array_length(v_quote.items) = 0 THEN
    RAISE EXCEPTION 'La cotización no contiene líneas válidas';
  END IF;
  IF v_quote.total IS NULL OR v_quote.total <= 0 OR v_quote.subtotal < 0 OR v_quote.tax < 0 THEN
    RAISE EXCEPTION 'Los importes de la cotización no son válidos';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_quote.business_id::text || ':invoice', 0));
  SELECT COALESCE(MAX(invoice_number), 0) + 1 INTO v_number
  FROM public.invoices WHERE business_id = v_quote.business_id;

  v_discount := round(COALESCE(v_quote.subtotal, 0) * COALESCE(v_quote.discount_pct, 0) / 100, 2);
  SELECT jsonb_build_object(
    'name', b.name,
    'tax_id', b.tax_id,
    'logo_url', b.logo_url,
    'industry', b.industry
  ) INTO v_issuer_snapshot
  FROM public.businesses b
  WHERE b.id = v_quote.business_id;

  v_customer_snapshot := CASE
    WHEN jsonb_typeof(v_quote.customer_snapshot) = 'object' AND v_quote.customer_snapshot <> '{}'::jsonb
      THEN v_quote.customer_snapshot
    ELSE jsonb_build_object('name', v_quote.customer_name)
  END;

  INSERT INTO public.invoices (
    business_id, customer_id, quote_id, invoice_number, status,
    customer_name, customer_snapshot, issuer_snapshot, items_snapshot,
    subject, subtotal, discount_amount, tax_treatment, vat_rate,
    tax_amount, total, terms, notes, created_by
  ) VALUES (
    v_quote.business_id, v_quote.customer_id, p_quote_id, v_number, 'draft',
    v_quote.customer_name, v_customer_snapshot, COALESCE(v_issuer_snapshot, '{}'::jsonb), v_quote.items,
    v_quote.subject, v_quote.subtotal, v_discount, v_quote.tax_treatment,
    CASE WHEN v_quote.tax_treatment = 'taxable' THEN v_quote.vat_rate ELSE 0 END,
    v_quote.tax, v_quote.total, v_quote.terms,
    'Documento interno de cobro originado desde cotización ' || COALESCE(v_quote.quote_number::text, p_quote_id::text)
      || '. No constituye DTE ni factura tributaria emitida ante el SII.',
    auth.uid()
  ) RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_events (business_id, invoice_id, event_type, event_data, actor_id)
  VALUES (v_quote.business_id, v_invoice_id, 'created_from_quote',
    jsonb_build_object('quote_id', p_quote_id, 'quote_number', v_quote.quote_number), auth.uid());

  RETURN v_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_internal_invoice(p_invoice_id UUID, p_due_date DATE DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
BEGIN
  SELECT i.* INTO v_invoice FROM public.invoices i WHERE i.id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento no encontrado'; END IF;
  IF NOT private.has_business_role(v_invoice.business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]) THEN
    RAISE EXCEPTION 'Sin permisos para emitir este documento';
  END IF;
  IF v_invoice.status <> 'draft' THEN RAISE EXCEPTION 'Solo se pueden emitir documentos en borrador'; END IF;
  IF v_invoice.total <= 0 THEN RAISE EXCEPTION 'El total debe ser mayor que cero'; END IF;

  UPDATE public.invoices
  SET status = 'issued', issued_at = now(), due_date = p_due_date, updated_at = now()
  WHERE id = p_invoice_id;

  INSERT INTO public.invoice_events (business_id, invoice_id, event_type, event_data, actor_id)
  VALUES (v_invoice.business_id, p_invoice_id, 'issued',
    jsonb_build_object('invoice_number', v_invoice.invoice_number, 'due_date', p_due_date), auth.uid());

  RETURN p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_internal_invoice_payment(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_payment_reference TEXT,
  p_idempotency_key TEXT
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
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'El abono debe ser un importe positivo con máximo dos decimales';
  END IF;
  IF length(trim(COALESCE(p_payment_method, ''))) = 0 OR length(trim(COALESCE(p_payment_method, ''))) > 80 THEN
    RAISE EXCEPTION 'Indica un medio de pago válido';
  END IF;
  IF length(trim(COALESCE(p_idempotency_key, ''))) < 8 OR length(p_idempotency_key) > 160 THEN
    RAISE EXCEPTION 'Clave de idempotencia inválida';
  END IF;

  SELECT i.* INTO v_invoice FROM public.invoices i WHERE i.id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento no encontrado'; END IF;
  IF NOT private.has_business_role(v_invoice.business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]) THEN
    RAISE EXCEPTION 'Sin permisos para registrar pagos';
  END IF;

  SELECT p.* INTO v_existing FROM public.invoice_payments p
  WHERE p.business_id = v_invoice.business_id AND p.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.invoice_id <> p_invoice_id OR v_existing.amount <> p_amount THEN
      RAISE EXCEPTION 'La clave de idempotencia ya fue utilizada para otra operación';
    END IF;
    RETURN v_existing.id;
  END IF;

  IF v_invoice.status NOT IN ('issued','partially_paid','overdue') THEN
    RAISE EXCEPTION 'El documento debe estar emitido y pendiente de cobro';
  END IF;

  SELECT COALESCE(SUM(p.amount), 0) INTO v_paid
  FROM public.invoice_payments p
  WHERE p.invoice_id = p_invoice_id AND p.status = 'confirmed';

  v_remaining := v_invoice.total - v_paid;
  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'El abono supera el saldo pendiente';
  END IF;

  INSERT INTO public.invoice_payments (
    business_id, invoice_id, amount, payment_method, payment_reference,
    idempotency_key, status, source, recorded_by
  ) VALUES (
    v_invoice.business_id, p_invoice_id, p_amount, trim(p_payment_method),
    NULLIF(trim(COALESCE(p_payment_reference, '')), ''), p_idempotency_key,
    'confirmed', 'manual', auth.uid()
  ) RETURNING id INTO v_payment_id;

  -- A confirmed manual receipt creates exactly one income transaction for cash-flow reporting.
  -- It does not create a sale, move inventory, or issue a tax document.
  INSERT INTO public.transactions (business_id, type, category, amount, description, tx_date)
  VALUES (
    v_invoice.business_id, 'income', 'Cobros de documentos', p_amount,
    'Abono documento interno ' || lpad(v_invoice.invoice_number::text, 6, '0')
      || ' · ' || v_invoice.customer_name,
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
  VALUES (v_invoice.business_id, p_invoice_id, 'payment_recorded',
    jsonb_build_object('payment_id', v_payment_id, 'transaction_id', v_transaction_id, 'amount', p_amount, 'payment_method', p_payment_method, 'paid_total', v_paid, 'remaining', v_invoice.total - v_paid),
    auth.uid());

  RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_accepted_quote_to_invoice(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.issue_internal_invoice(UUID, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_internal_invoice_payment(UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_accepted_quote_to_invoice(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_internal_invoice(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_internal_invoice_payment(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
