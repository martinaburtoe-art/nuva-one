-- Reconciliación de drift: estas columnas y la definición extendida de
-- businesses_public ya existían en producción (aplicadas directamente,
-- sin migración trackeada). Este archivo deja el repo consistente con la
-- base de datos real. Todo es idempotente: no cambia nada si ya existe.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS public_photos TEXT[],
  ADD COLUMN IF NOT EXISTS public_social_links JSONB,
  ADD COLUMN IF NOT EXISTS public_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS public_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS comuna TEXT;

COMMENT ON COLUMN public.businesses.logo_url IS
  'URL del logo mostrado en el perfil público y el foro.';
COMMENT ON COLUMN public.businesses.public_photos IS
  'Fotos del negocio mostradas en su perfil público del directorio.';
COMMENT ON COLUMN public.businesses.public_social_links IS
  'Redes sociales del negocio (instagram, facebook, whatsapp, web) mostradas en el perfil público.';
COMMENT ON COLUMN public.businesses.comuna IS
  'Comuna del negocio, mostrada en el directorio público para búsqueda local.';

-- El directorio público (negocios/*) requiere plan pro: es un beneficio de
-- plan pago, no un feature de trial. Reemplaza la definición original de
-- 20260811160000 (que no filtraba por plan) por la vigente en producción.
CREATE OR REPLACE VIEW public.businesses_public AS
SELECT
  id, name, industry, public_slug, public_description,
  logo_url, public_photos, public_social_links,
  public_contact_email, public_contact_phone, comuna, created_at
FROM public.businesses
WHERE public_enabled = true AND plan = 'pro';

GRANT SELECT ON public.businesses_public TO anon, authenticated;
