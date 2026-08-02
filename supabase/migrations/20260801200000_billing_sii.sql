-- Facturación electrónica SII vía OpenFactura (Haulmer). Cada negocio pega
-- su propia API Key de OpenFactura (obtenida en su cuenta de openfactura.cl,
-- donde ya configuraron su certificado digital ante el SII) -- Nüva One
-- nunca maneja certificados ni claves del SII directamente, solo llama a la
-- API de OpenFactura en nombre del negocio.

CREATE TABLE IF NOT EXISTS public.billing_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'openfactura',
  status TEXT NOT NULL DEFAULT 'disconnected', -- disconnected | connected
  environment TEXT NOT NULL DEFAULT 'dev', -- dev (pruebas) | prod
  api_key TEXT,
  rut TEXT,
  razon_social TEXT,
  giro TEXT,
  acteco TEXT,
  direccion TEXT,
  comuna TEXT,
  cdg_sii_sucur TEXT,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider)
);

CREATE TABLE IF NOT EXISTS public.billing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  tipo_dte INTEGER NOT NULL, -- 33 factura, 34 factura exenta, 39 boleta, 41 boleta exenta
  folio INTEGER,
  environment TEXT NOT NULL DEFAULT 'dev',
  status TEXT NOT NULL DEFAULT 'emitted', -- emitted | error
  receptor_rut TEXT,
  receptor_name TEXT,
  net_amount NUMERIC,
  iva_amount NUMERIC,
  total NUMERIC NOT NULL DEFAULT 0,
  pdf_base64 TEXT,
  error_message TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_integrations TO authenticated;
GRANT ALL ON public.billing_integrations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_documents TO authenticated;
GRANT ALL ON public.billing_documents TO service_role;

ALTER TABLE public.billing_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read billing_integrations" ON public.billing_integrations
  FOR SELECT USING (private.is_business_member(business_id, auth.uid()));
CREATE POLICY "Staff+ write billing_integrations" ON public.billing_integrations
  FOR INSERT WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::member_role[]));
CREATE POLICY "Staff+ update billing_integrations" ON public.billing_integrations
  FOR UPDATE USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::member_role[]));
CREATE POLICY "Staff+ delete billing_integrations" ON public.billing_integrations
  FOR DELETE USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::member_role[]));

CREATE POLICY "Members read billing_documents" ON public.billing_documents
  FOR SELECT USING (private.is_business_member(business_id, auth.uid()));
CREATE POLICY "Staff+ write billing_documents" ON public.billing_documents
  FOR INSERT WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::member_role[]));
CREATE POLICY "Staff+ update billing_documents" ON public.billing_documents
  FOR UPDATE USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::member_role[]));
CREATE POLICY "Staff+ delete billing_documents" ON public.billing_documents
  FOR DELETE USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::member_role[]));

CREATE INDEX idx_billing_integrations_biz ON public.billing_integrations(business_id);
CREATE INDEX idx_billing_documents_biz ON public.billing_documents(business_id, created_at DESC);

-- Conectar/desconectar la API Key es sensible (permite emitir documentos
-- tributarios reales), igual que hicimos con marketing_integrations.
DROP TRIGGER IF EXISTS trg_audit_billing_integrations ON public.billing_integrations;
CREATE TRIGGER trg_audit_billing_integrations
  AFTER INSERT OR UPDATE OR DELETE ON public.billing_integrations
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS trg_audit_billing_documents ON public.billing_documents;
CREATE TRIGGER trg_audit_billing_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.billing_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();
