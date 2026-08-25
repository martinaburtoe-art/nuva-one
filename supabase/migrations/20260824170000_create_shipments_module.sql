-- Nüva One — Envíos & Entregas hardening/extension.
-- The core shipments + shipment_events tables already exist from
-- 20260817210000_shipments_module.sql. This migration only adds fields,
-- indexes and policies needed by the upgraded operations workspace.

ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS comuna TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_priority_check;
ALTER TABLE public.shipments ADD CONSTRAINT shipments_priority_check CHECK (priority IN ('low','normal','high','urgent'));
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_shipping_cost_check;
ALTER TABLE public.shipments ADD CONSTRAINT shipments_shipping_cost_check CHECK (shipping_cost >= 0);

CREATE INDEX IF NOT EXISTS shipments_business_created_idx ON public.shipments(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shipments_business_tracking_idx ON public.shipments(business_id, tracking_number);
CREATE INDEX IF NOT EXISTS shipments_business_eta_idx ON public.shipments(business_id, eta);
CREATE INDEX IF NOT EXISTS shipments_business_priority_idx ON public.shipments(business_id, priority);
CREATE INDEX IF NOT EXISTS shipment_events_business_created_idx ON public.shipment_events(business_id, occurred_at DESC);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shipments_select_member ON public.shipments;
DROP POLICY IF EXISTS shipments_insert_member ON public.shipments;
DROP POLICY IF EXISTS shipments_update_member ON public.shipments;
DROP POLICY IF EXISTS shipments_delete_member ON public.shipments;
CREATE POLICY shipments_select_member ON public.shipments FOR SELECT USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = shipments.business_id AND bm.user_id = (select auth.uid())));
CREATE POLICY shipments_insert_member ON public.shipments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = shipments.business_id AND bm.user_id = (select auth.uid())));
CREATE POLICY shipments_update_member ON public.shipments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = shipments.business_id AND bm.user_id = (select auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = shipments.business_id AND bm.user_id = (select auth.uid())));
CREATE POLICY shipments_delete_member ON public.shipments FOR DELETE USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = shipments.business_id AND bm.user_id = (select auth.uid())));

DROP POLICY IF EXISTS shipment_events_select_member ON public.shipment_events;
DROP POLICY IF EXISTS shipment_events_insert_member ON public.shipment_events;
DROP POLICY IF EXISTS shipment_events_update_member ON public.shipment_events;
DROP POLICY IF EXISTS shipment_events_delete_member ON public.shipment_events;
CREATE POLICY shipment_events_select_member ON public.shipment_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = shipment_events.business_id AND bm.user_id = (select auth.uid())));
CREATE POLICY shipment_events_insert_member ON public.shipment_events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = shipment_events.business_id AND bm.user_id = (select auth.uid())));
CREATE POLICY shipment_events_update_member ON public.shipment_events FOR UPDATE USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = shipment_events.business_id AND bm.user_id = (select auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = shipment_events.business_id AND bm.user_id = (select auth.uid())));
CREATE POLICY shipment_events_delete_member ON public.shipment_events FOR DELETE USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = shipment_events.business_id AND bm.user_id = (select auth.uid())));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipment_events TO authenticated;
