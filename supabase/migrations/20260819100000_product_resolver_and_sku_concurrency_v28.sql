-- Nüva One: harden product resolution and SKU generation.
-- The resolver derives tenant context from auth.uid(); callers never supply business_id.

CREATE OR REPLACE FUNCTION public.lookup_product_by_code(p_code TEXT)
RETURNS TABLE(product_id UUID,business_id UUID,name TEXT,sku TEXT,barcode TEXT,code_type TEXT,stock INTEGER,price NUMERIC,cost NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH requested AS (SELECT lower(btrim(p_code)) AS code WHERE p_code IS NOT NULL AND length(btrim(p_code)) > 0)
  SELECT p.id,p.business_id,p.name,p.sku,COALESCE(pc.code,NULLIF(btrim(p.barcode),'')),COALESCE(pc.code_type,'barcode'),p.stock,p.price,p.cost
  FROM public.products p
  CROSS JOIN requested r
  LEFT JOIN public.product_codes pc ON pc.product_id=p.id AND pc.business_id=p.business_id AND pc.is_active AND lower(btrim(pc.code))=r.code
  WHERE private.is_business_member(p.business_id,(select auth.uid()))
    AND (pc.id IS NOT NULL OR lower(btrim(COALESCE(p.barcode,'')))=r.code OR lower(btrim(COALESCE(p.sku,'')))=r.code)
  ORDER BY CASE WHEN lower(btrim(COALESCE(p.sku,'')))=r.code THEN 0 WHEN pc.id IS NOT NULL AND pc.is_primary THEN 1 WHEN pc.id IS NOT NULL THEN 2 ELSE 3 END,p.id
  LIMIT 2;
$$;

REVOKE ALL ON FUNCTION public.lookup_product_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_product_by_code(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_product_sku(p_prefix TEXT DEFAULT 'NVA-PRD')
RETURNS TEXT LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_business UUID; v_prefix TEXT := btrim(COALESCE(p_prefix,'NVA-PRD')); v_candidate TEXT; v_seq BIGINT;
BEGIN
  IF v_prefix='' OR length(v_prefix)>40 THEN RAISE EXCEPTION 'Prefijo de SKU inválido' USING ERRCODE='22023'; END IF;
  SELECT bm.business_id INTO v_business FROM public.business_members bm WHERE bm.user_id=(select auth.uid()) ORDER BY bm.created_at,bm.business_id LIMIT 1;
  IF v_business IS NULL THEN RAISE EXCEPTION 'No existe un negocio activo para el usuario' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_business::text||':'||v_prefix,0));
  SELECT COALESCE(MAX((regexp_match(sku,'([0-9]+)$'))[1]::BIGINT),0)+1 INTO v_seq FROM public.products WHERE business_id=v_business AND sku IS NOT NULL AND sku LIKE v_prefix||'-%';
  v_candidate:=v_prefix||'-'||lpad(v_seq::TEXT,6,'0'); RETURN v_candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_product_sku(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_product_sku(TEXT) TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS ux_products_business_sku_nonblank ON public.products (business_id, lower(btrim(sku))) WHERE sku IS NOT NULL AND btrim(sku) <> '';
