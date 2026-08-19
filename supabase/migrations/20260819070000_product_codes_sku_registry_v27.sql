-- Nüva One: normalized product-code registry.
-- SKU remains an internal product identifier; product_codes stores external/alternate codes.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_business_id_id_unique') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_business_id_id_unique UNIQUE (business_id, id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.product_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  code_type TEXT NOT NULL DEFAULT 'barcode',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_code TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_codes_type_check CHECK (code_type IN ('ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf','codabar','qr_code','supplier','alternate','barcode')),
  CONSTRAINT product_codes_code_not_blank CHECK (length(btrim(code)) > 0),
  CONSTRAINT product_codes_business_product_fk FOREIGN KEY (business_id, product_id) REFERENCES public.products(business_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_product_codes_business_code ON public.product_codes (business_id, lower(btrim(code)));
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_codes_primary_product ON public.product_codes (business_id, product_id) WHERE is_primary AND is_active;
CREATE INDEX IF NOT EXISTS idx_product_codes_product ON public.product_codes (business_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_codes_supplier ON public.product_codes (business_id, supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_business_sku ON public.products (business_id, lower(btrim(sku))) WHERE sku IS NOT NULL AND btrim(sku) <> '';
CREATE INDEX IF NOT EXISTS idx_products_business_barcode ON public.products (business_id, lower(btrim(barcode))) WHERE barcode IS NOT NULL AND btrim(barcode) <> '';

-- Preserve legacy barcode values while moving the registry to product_codes.
INSERT INTO public.product_codes (business_id, product_id, code, code_type, is_primary, is_active)
SELECT p.business_id, p.id, btrim(p.barcode), 'barcode', true, true
FROM public.products p
WHERE p.barcode IS NOT NULL AND btrim(p.barcode) <> ''
ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_codes TO authenticated;
GRANT ALL ON public.product_codes TO service_role;
ALTER TABLE public.product_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members access product_codes" ON public.product_codes;
CREATE POLICY "Members read product_codes" ON public.product_codes FOR SELECT
  USING (public.is_business_member(business_id, (select auth.uid())));
CREATE POLICY "Operators create product_codes" ON public.product_codes FOR INSERT
  WITH CHECK (public.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin','staff']::public.member_role[]));
CREATE POLICY "Operators update product_codes" ON public.product_codes FOR UPDATE
  USING (public.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin','staff']::public.member_role[]))
  WITH CHECK (public.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin','staff']::public.member_role[]));
CREATE POLICY "Operators delete product_codes" ON public.product_codes FOR DELETE
  USING (public.has_business_role(business_id, (select auth.uid()), ARRAY['owner','admin','staff']::public.member_role[]));

CREATE OR REPLACE FUNCTION public.lookup_product_by_code(p_code TEXT)
RETURNS TABLE(product_id UUID, business_id UUID, name TEXT, sku TEXT, barcode TEXT, code_type TEXT, stock INTEGER, price NUMERIC, cost NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT p.id, p.business_id, p.name, p.sku,
         COALESCE(pc.code, NULLIF(p.barcode, '')) AS barcode,
         COALESCE(pc.code_type, 'barcode') AS code_type,
         p.stock, p.price, p.cost
  FROM public.products p
  LEFT JOIN public.product_codes pc
    ON pc.product_id = p.id AND pc.business_id = p.business_id
   AND pc.is_active AND lower(btrim(pc.code)) = lower(btrim(p_code))
  WHERE public.is_business_member(p.business_id, (select auth.uid()))
    AND (pc.id IS NOT NULL OR lower(btrim(COALESCE(p.barcode, ''))) = lower(btrim(p_code)) OR lower(btrim(COALESCE(p.sku, ''))) = lower(btrim(p_code)))
  ORDER BY CASE WHEN lower(btrim(COALESCE(p.sku, ''))) = lower(btrim(p_code)) THEN 0 ELSE 1 END
  LIMIT 2;
$$;
REVOKE ALL ON FUNCTION public.lookup_product_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_product_by_code(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_product_sku(p_prefix TEXT DEFAULT 'NVA-PRD')
RETURNS TEXT LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_business UUID; v_candidate TEXT; v_seq BIGINT;
BEGIN
  SELECT business_id INTO v_business FROM public.business_members WHERE user_id = (select auth.uid()) ORDER BY created_at LIMIT 1;
  IF v_business IS NULL THEN RAISE EXCEPTION 'No existe un negocio activo para el usuario' USING ERRCODE='42501'; END IF;
  SELECT COALESCE(MAX(NULLIF(regexp_replace(sku, '[^0-9]', '', 'g'), '')::BIGINT), 0) + 1 INTO v_seq
    FROM public.products WHERE business_id = v_business AND sku LIKE btrim(p_prefix) || '-%';
  v_candidate := btrim(p_prefix) || '-' || lpad(v_seq::TEXT, 6, '0');
  RETURN v_candidate;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_product_sku(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_product_sku(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_product_codes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_product_codes_updated_at ON public.product_codes;
CREATE TRIGGER trg_product_codes_updated_at BEFORE UPDATE ON public.product_codes FOR EACH ROW EXECUTE FUNCTION public.touch_product_codes_updated_at();
