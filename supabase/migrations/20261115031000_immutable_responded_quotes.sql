-- Preserve the exact commercial offer after a recipient has accepted or rejected it.
-- Drafts remain editable unless they have an active, unresponded share link.
CREATE OR REPLACE FUNCTION public.prevent_shared_quote_content_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF ROW(
    OLD.customer_name, OLD.customer_snapshot, OLD.subject, OLD.items,
    OLD.subtotal, OLD.discount_pct, OLD.tax, OLD.total, OLD.tax_treatment,
    OLD.vat_rate, OLD.price_basis, OLD.valid_until, OLD.notes, OLD.terms
  ) IS DISTINCT FROM ROW(
    NEW.customer_name, NEW.customer_snapshot, NEW.subject, NEW.items,
    NEW.subtotal, NEW.discount_pct, NEW.tax, NEW.total, NEW.tax_treatment,
    NEW.vat_rate, NEW.price_basis, NEW.valid_until, NEW.notes, NEW.terms
  ) THEN
    IF OLD.status IN ('accepted', 'rejected') THEN
      RAISE EXCEPTION 'QUOTE_RESPONSE_IMMUTABLE'
        USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.document_share_links l
      WHERE l.quote_id = OLD.id
        AND l.revoked_at IS NULL
        AND l.responded_at IS NULL
        AND l.expires_at > now()
    ) THEN
      RAISE EXCEPTION 'QUOTE_HAS_ACTIVE_SHARE_LINK'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_shared_quote_content_mutation()
  FROM PUBLIC, anon, authenticated;
