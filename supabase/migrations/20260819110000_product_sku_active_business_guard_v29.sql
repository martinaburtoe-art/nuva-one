-- Nüva One: SKU generation must target the UI-selected business while
-- remaining tenant-safe. The client may identify the active tenant, but
-- Postgres verifies membership before reading or generating any SKU.

CREATE OR REPLACE FUNCTION public.generate_product_sku(p_business_id UUID, p_prefix TEXT DEFAULT 'NVA-PRD')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_candidate TEXT;
  v_seq BIGINT;
  v_prefix TEXT := btrim(COALESCE(p_prefix, 'NVA-PRD'));
BEGIN
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'Negocio requerido' USING ERRCODE = '22023';
  END IF;

  IF NOT private.is_business_member(p_business_id, (select auth.uid())) THEN
    RAISE EXCEPTION 'No autorizado para este negocio' USING ERRCODE = '42501';
  END IF;

  IF v_prefix = '' OR length(v_prefix) > 40 THEN
    RAISE EXCEPTION 'Prefijo de SKU inválido' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text || ':' || v_prefix, 0));

  SELECT COALESCE(MAX((regexp_match(sku, '([0-9]+)$'))[1]::BIGINT), 0) + 1
    INTO v_seq
  FROM public.products
  WHERE business_id = p_business_id
    AND sku IS NOT NULL
    AND sku LIKE v_prefix || '-%';

  v_candidate := v_prefix || '-' || lpad(v_seq::TEXT, 6, '0');
  RETURN v_candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_product_sku(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_product_sku(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.generate_product_sku(TEXT) FROM PUBLIC, authenticated;
