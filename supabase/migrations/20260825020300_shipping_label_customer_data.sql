-- Shipping label / CRM persistence.
-- Keeps recurring destination data on customers and the exact snapshot used by each shipment.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS shipping_comuna TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city TEXT,
  ADD COLUMN IF NOT EXISTS shipping_region TEXT,
  ADD COLUMN IF NOT EXISTS shipping_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS shipping_contact_name TEXT;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS destination_email TEXT,
  ADD COLUMN IF NOT EXISTS destination_rut TEXT,
  ADD COLUMN IF NOT EXISTS destination_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS recipient_contact TEXT,
  ADD COLUMN IF NOT EXISTS package_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS content_description TEXT,
  ADD COLUMN IF NOT EXISTS declared_value NUMERIC,
  ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'prepaid',
  ADD COLUMN IF NOT EXISTS reference_code TEXT,
  ADD COLUMN IF NOT EXISTS destination_country TEXT NOT NULL DEFAULT 'Chile';

COMMENT ON COLUMN public.shipments.reference_code IS 'Referencia interna del envío para trazabilidad y etiquetas';
COMMENT ON COLUMN public.shipments.payment_type IS 'prepaid = pagado en origen, collect = por pagar en destino';
