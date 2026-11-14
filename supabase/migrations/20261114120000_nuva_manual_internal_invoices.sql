-- Create internal collection documents directly, without requiring a prior quote.
-- All totals are recalculated server-side; this function does not issue SII DTEs.

ALTER TABLE public.invoice_events
  DROP CONSTRAINT IF EXISTS invoice_events_event_type_check;
ALTER TABLE public.invoice_events
  ADD CONSTRAINT invoice_events_event_type_check
  CHECK (event_type IN ('created_from_quote','created_manual','issued','payment_recorded','payment_voided','marked_overdue','voided'));

CREATE OR REPLACE FUNCTION public.create_manual_internal_invoice(
  p_business_id UUID,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_customer_id UUID;
  v_customer_name TEXT;
  v_customer_snapshot JSONB;
  v_issuer_snapshot JSONB;
  v_items JSONB;
  v_item JSONB;
  v_name TEXT;
  v_qty NUMERIC;
  v_price NUMERIC;
  v_line NUMERIC;
  v_subtotal NUMERIC(14,2) := 0;
  v_discount_pct NUMERIC(7,4);
  v_discount NUMERIC(14,2);
  v_tax_treatment TEXT;
  v_price_basis TEXT;
  v_vat_rate NUMERIC(5,2);
  v_tax NUMERIC(14,2);
  v_total NUMERIC(14,2);
  v_number BIGINT;
  v_invoice_id UUID;
  v_subject TEXT;
  v_terms TEXT;
  v_notes TEXT;
  v_index INTEGER := 0;
BEGIN
  IF p_business_id IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Datos del documento inválidos';
  END IF;

  IF NOT private.has_business_role(
    p_business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]
  ) THEN
    RAISE EXCEPTION 'Sin permisos para crear documentos en este negocio';
  END IF;

  v_customer_name := NULLIF(trim(p_payload->>'customer_name'), '');
  IF v_customer_name IS NULL OR char_length(v_customer_name) > 180 THEN
    RAISE EXCEPTION 'Indica un nombre de cliente válido';
  END IF;

  v_customer_id := NULLIF(p_payload->>'customer_id', '')::UUID;
  IF v_customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = v_customer_id AND c.business_id = p_business_id
  ) THEN
    RAISE EXCEPTION 'El cliente no pertenece al negocio activo';
  END IF;

  v_customer_snapshot := CASE
    WHEN jsonb_typeof(p_payload->'customer_snapshot') = 'object'
      THEN p_payload->'customer_snapshot'
    ELSE '{}'::jsonb
  END;
  v_customer_snapshot := v_customer_snapshot || jsonb_build_object('name', v_customer_name);

  v_items := p_payload->'items';
  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) < 1 OR jsonb_array_length(v_items) > 100 THEN
    RAISE EXCEPTION 'Agrega entre 1 y 100 líneas válidas';
  END IF;

  v_tax_treatment := COALESCE(p_payload->>'tax_treatment', 'taxable');
  v_price_basis := COALESCE(p_payload->>'price_basis', 'net');
  v_vat_rate := COALESCE(NULLIF(p_payload->>'vat_rate','')::NUMERIC, 19);
  v_discount_pct := COALESCE(NULLIF(p_payload->>'discount_pct','')::NUMERIC, 0);
  IF v_tax_treatment NOT IN ('taxable','exempt','non_taxable')
    OR v_price_basis NOT IN ('net','gross')
    OR v_vat_rate < 0 OR v_vat_rate > 100
    OR v_discount_pct < 0 OR v_discount_pct > 100 THEN
    RAISE EXCEPTION 'Tratamiento tributario, modalidad o descuento inválido';
  END IF;

  IF v_tax_treatment <> 'taxable' THEN
    v_vat_rate := 0;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items)
  LOOP
    v_index := v_index + 1;
    v_name := NULLIF(trim(v_item->>'name'), '');
    v_qty := (v_item->>'qty')::NUMERIC;
    v_price := (v_item->>'price')::NUMERIC;
    IF v_name IS NULL OR char_length(v_name) > 240 OR v_qty <= 0 OR v_price < 0
      OR v_qty > 1000000 OR v_price > 100000000000 THEN
      RAISE EXCEPTION 'La línea % contiene nombre, cantidad o precio inválido', v_index;
    END IF;
    v_line := round(v_qty * v_price, 0);
    IF v_price_basis = 'gross' AND v_vat_rate > 0 THEN
      v_line := round(v_line * 100 / (100 + v_vat_rate), 0);
    END IF;
    v_subtotal := v_subtotal + v_line;
    IF v_subtotal > 99999999999999 THEN
      RAISE EXCEPTION 'El subtotal supera el máximo admitido';
    END IF;
  END LOOP;

  v_discount := round(v_subtotal * v_discount_pct / 100, 0);
  v_tax := round((v_subtotal - v_discount) * v_vat_rate / 100, 0);
  v_total := v_subtotal - v_discount + v_tax;
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'El total del documento debe ser mayor que cero';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text || ':invoice', 0));
  SELECT COALESCE(MAX(invoice_number), 0) + 1 INTO v_number
  FROM public.invoices WHERE business_id = p_business_id;

  SELECT jsonb_build_object(
    'name', b.name, 'tax_id', b.tax_id, 'giro', b.giro, 'address', b.address,
    'comuna', b.comuna, 'logo_url', b.logo_url, 'industry', b.industry,
    'public_contact_email', b.public_contact_email, 'public_contact_phone', b.public_contact_phone
  ) INTO v_issuer_snapshot
  FROM public.businesses b WHERE b.id = p_business_id;

  v_subject := NULLIF(trim(p_payload->>'subject'), '');
  v_terms := NULLIF(trim(p_payload->>'terms'), '');
  v_notes := NULLIF(trim(p_payload->>'notes'), '');

  INSERT INTO public.invoices (
    business_id, customer_id, quote_id, invoice_number, status,
    customer_name, customer_snapshot, issuer_snapshot, items_snapshot,
    subject, subtotal, discount_amount, tax_treatment, price_basis, vat_rate,
    tax_amount, total, terms, notes, created_by
  ) VALUES (
    p_business_id, v_customer_id, NULL, v_number, 'draft',
    v_customer_name, v_customer_snapshot, COALESCE(v_issuer_snapshot, '{}'::jsonb), v_items,
    v_subject, v_subtotal, v_discount, v_tax_treatment, v_price_basis, v_vat_rate,
    v_tax, v_total, v_terms,
    concat_ws(E'\n', v_notes, 'Documento interno de cobro. No constituye DTE ni factura tributaria emitida ante el SII.'),
    auth.uid()
  ) RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_events (business_id, invoice_id, event_type, event_data, actor_id)
  VALUES (p_business_id, v_invoice_id, 'created_manual',
    jsonb_build_object('invoice_number', v_number, 'source', 'manual'), auth.uid());

  RETURN v_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_manual_internal_invoice(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_manual_internal_invoice(UUID, JSONB) TO authenticated;
