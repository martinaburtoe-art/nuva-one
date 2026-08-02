-- Cotizaciones "premium": numeración correlativa por negocio (COT-0001),
-- descuento global y condiciones/términos editables para el PDF.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS quote_number INTEGER,
  ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terms TEXT;

-- Backfill: numera las cotizaciones existentes por negocio en orden de creación.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY business_id ORDER BY created_at) AS rn
  FROM public.quotes
  WHERE quote_number IS NULL
)
UPDATE public.quotes q SET quote_number = numbered.rn
FROM numbered WHERE q.id = numbered.id;

CREATE OR REPLACE FUNCTION public.assign_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    SELECT COALESCE(MAX(quote_number), 0) + 1 INTO NEW.quote_number
    FROM public.quotes WHERE business_id = NEW.business_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_assign_quote_number ON public.quotes;
CREATE TRIGGER trg_assign_quote_number
  BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.assign_quote_number();

DROP INDEX IF EXISTS idx_quotes_business_number;
CREATE UNIQUE INDEX idx_quotes_business_number ON public.quotes (business_id, quote_number);
