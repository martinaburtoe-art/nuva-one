-- Nüva One — Envíos & Entregas
-- Operational shipment lifecycle linked to sales, with tenant isolation.

CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id UUID NULL REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_id UUID NULL REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  address TEXT NOT NULL,
  comuna TEXT,
  city TEXT,
  region TEXT,
  carrier TEXT,
  service_type TEXT NOT NULL DEFAULT 'standard',
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preparing','ready','shipped','in_transit','out_for_delivery','delivered','failed','returned','cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  shipping_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  estimated_delivery_date DATE,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failure_reason TEXT,
  delivery_notes TEXT,
  proof_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipments_business_status_idx ON public.shipments(business_id, status);
CREATE INDEX IF NOT EXISTS shipments_business_created_idx ON public.shipments(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shipments_business_tracking_idx ON public.shipments(business_id, tracking_number);
CREATE INDEX IF NOT EXISTS shipments_business_sale_idx ON public.shipments(business_id, sale_id);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view shipments" ON public.shipments;
CREATE POLICY "Business members can view shipments"
  ON public.shipments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = shipments.business_id
      AND bm.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Business members can insert shipments" ON public.shipments;
CREATE POLICY "Business members can insert shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = shipments.business_id
      AND bm.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Business members can update shipments" ON public.shipments;
CREATE POLICY "Business members can update shipments"
  ON public.shipments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = shipments.business_id
      AND bm.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = shipments.business_id
      AND bm.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Business members can delete shipments" ON public.shipments;
CREATE POLICY "Business members can delete shipments"
  ON public.shipments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = shipments.business_id
      AND bm.user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipments TO authenticated;
