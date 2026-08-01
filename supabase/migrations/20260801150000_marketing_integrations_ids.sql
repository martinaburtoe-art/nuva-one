-- Separa el ID de página de Facebook del ID de cuenta de Instagram Business,
-- necesarios por separado para llamar al Graph API (posts/insights de IG vs
-- publicar en el muro de Facebook).
ALTER TABLE public.marketing_integrations
  ADD COLUMN IF NOT EXISTS fb_page_id TEXT,
  ADD COLUMN IF NOT EXISTS ig_user_id TEXT;
