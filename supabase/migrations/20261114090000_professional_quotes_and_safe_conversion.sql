-- Professional quote foundations: deterministic numbering, explicit tax semantics,
-- and a conversion that creates a non-posting draft sale (never a fictitious payment).
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS quote_number INTEGER,
  ADD COLUMN IF NOT EXISTS tax_treatment TEXT NOT NULL DEFAULT 'taxable',
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) NOT NULL DEFAULT 19,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS customer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY business_id ORDER BY created_at, id) AS rn
  FROM public.quotes
  WHERE quote_number IS NULL
)
UPDATE public.quotes q
SET quote_number = numbered.rn
FROM numbered
WHERE q.id = numbered.id;

ALTER TABLE public.quotes
  ALTER COLUMN quote_number SET NOT NULL;

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_tax_treatment_check,
  ADD CONSTRAINT quotes_tax_treatment_check
    CHECK (tax_treatment IN ('taxable', 'exempt', 'non_taxable')),
  DROP CONSTRAINT IF EXISTS quotes_vat_rate_check,
  ADD CONSTRAINT quotes_vat_rate_check
    CHECK (vat_rate >= 0 AND vat_rate <= 100),
  DROP CONSTRAINT IF EXISTS quotes_non_taxable_rate_check,
  ADD CONSTRAINT quotes_non_taxable_rate_check
    CHECK (tax_treatment = 'taxable' OR vat_rate = 0),
  DROP CONSTRAINT IF EXISTS quotes_customer_snapshot_object_check,
  ADD CONSTRAINT quotes_customer_snapshot_object_check
    CHECK (jsonb_typeof(customer_snapshot) = 'object'),
  DROP CONSTRAINT IF EXISTS quotes_subject_length_check,
  ADD CONSTRAINT quotes_subject_length_check
    CHECK (subject IS NULL OR length(subject) <= 240);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_business_number
  ON public.quotes (business_id, quote_number);

CREATE OR REPLACE FUNCTION public.assign_quote_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.business_id::text, 0));
    SELECT COALESCE(MAX(quote_number), 0) + 1
      INTO NEW.quote_number
      FROM public.quotes
      WHERE business_id = NEW.business_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_quote_number ON public.quotes;
CREATE TRIGGER trg_assign_quote_number
  BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.assign_quote_number();

-- Draft sales must not enter the financial posting queue. Posting begins only
-- after the sales workflow moves the document to pending/paid.
CREATE OR REPLACE FUNCTION public.enqueue_sale_financial_posting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('pending', 'paid')
     AND COALESCE(NEW.total, 0) > 0
     AND NEW.accounting_journal_id IS NULL THEN
    PERFORM public.queue_financial_source(
      NEW.business_id, 'sale', NEW.id, NEW.sale_date, NEW.total
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_quote_to_sale(p_quote_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_sale UUID;
  v_existing UUID;
BEGIN
  SELECT q.* INTO v_quote
  FROM public.quotes q
  WHERE q.id = p_quote_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cotización no encontrada';
  END IF;

  IF NOT private.has_business_role(
    v_quote.business_id,
    auth.uid(),
    ARRAY['owner','admin','staff']::public.member_role[]
  ) THEN
    RAISE EXCEPTION 'Sin permisos para convertir esta cotización';
  END IF;

  SELECT s.id INTO v_existing
  FROM public.sales s
  WHERE s.business_id = v_quote.business_id
    AND s.quote_id = p_quote_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  IF v_quote.status <> 'accepted' THEN
    RAISE EXCEPTION 'La cotización debe estar aceptada antes de convertirla';
  END IF;

  IF jsonb_typeof(v_quote.items) <> 'array'
     OR jsonb_array_length(v_quote.items) = 0 THEN
    RAISE EXCEPTION 'La cotización no contiene productos';
  END IF;

  INSERT INTO public.sales (
    business_id, customer_id, customer_name, channel, payment_method, status,
    total, notes, sale_date, items, quote_id, stock_applied, is_credit,
    due_date, paid_amount, pos_reference, tax_treatment, vat_rate
  ) VALUES (
    v_quote.business_id, v_quote.customer_id, v_quote.customer_name,
    'cotizacion', NULL, 'draft',
    v_quote.total, 'Borrador generado desde cotización aceptada',
    CURRENT_DATE, v_quote.items, p_quote_id, FALSE, TRUE,
    NULL, 0, 'QUOTE-' || substr(p_quote_id::text, 1, 12),
    v_quote.tax_treatment, v_quote.vat_rate
  )
  RETURNING id INTO v_sale;

  RETURN v_sale;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.convert_quote_to_sale(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_sale(UUID) TO authenticated;
CREATE UNIQUE INDEX IF NOT EXISTS sales_quote_id_unique
  ON public.sales (quote_id) WHERE quote_id IS NOT NULL;
