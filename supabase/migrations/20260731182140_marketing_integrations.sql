-- Tabla para dejar el módulo de Marketing listo para vincular cuentas
-- (Meta/Instagram/Facebook) en cuanto exista una app de Meta Developer.
-- Por ahora permite guardar un token de acceso pegado manualmente por el
-- dueño del negocio (long-lived token de Meta Graph API), de forma que
-- las publicaciones puedan enviarse ni bien se conecte el envío real,
-- sin requerir otra migración.

CREATE TABLE IF NOT EXISTS public.marketing_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'meta',
  status TEXT NOT NULL DEFAULT 'disconnected', -- disconnected | connected
  account_name TEXT,
  page_id TEXT,
  access_token TEXT,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_integrations TO authenticated;
GRANT ALL ON public.marketing_integrations TO service_role;
ALTER TABLE public.marketing_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read marketing_integrations" ON public.marketing_integrations
  FOR SELECT USING (private.is_business_member(business_id, auth.uid()));
CREATE POLICY "Staff+ write marketing_integrations" ON public.marketing_integrations
  FOR INSERT WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::member_role[]));
CREATE POLICY "Staff+ update marketing_integrations" ON public.marketing_integrations
  FOR UPDATE USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::member_role[]));
CREATE POLICY "Staff+ delete marketing_integrations" ON public.marketing_integrations
  FOR DELETE USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::member_role[]));

CREATE INDEX idx_marketing_integrations_biz ON public.marketing_integrations(business_id);

-- Auditar conexión/desconexión de cuentas (acceso a tokens es sensible)
DROP TRIGGER IF EXISTS trg_audit_marketing_integrations ON public.marketing_integrations;
CREATE TRIGGER trg_audit_marketing_integrations
  AFTER INSERT OR UPDATE OR DELETE ON public.marketing_integrations
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();
