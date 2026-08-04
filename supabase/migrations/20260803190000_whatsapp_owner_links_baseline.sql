-- Baseline: la tabla whatsapp_owner_links ya existe en producción (creada
-- fuera del flujo normal de migraciones al construir la feature de
-- Vinculación WhatsApp). Este archivo documenta su esquema real en el repo
-- para que el historial de migraciones permita reconstruir la base de datos
-- desde cero. Usa IF NOT EXISTS / guards para ser seguro de aplicar tanto en
-- un entorno nuevo como en producción (donde la tabla ya existe).

CREATE TABLE IF NOT EXISTS public.whatsapp_owner_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  owner_phone_number text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_owner_links ENABLE ROW LEVEL SECURITY;

-- Mismo patrón usado en el resto de las tablas operativas: cualquier
-- miembro del negocio puede leer, pero solo staff/admin/owner puede
-- escribir (ver 20260719223003_restrict_viewer_role_writes.sql).
DROP POLICY IF EXISTS "Members read whatsapp_owner_links" ON public.whatsapp_owner_links;
CREATE POLICY "Members read whatsapp_owner_links"
  ON public.whatsapp_owner_links FOR SELECT
  USING (private.is_business_member(business_id, auth.uid()));

DROP POLICY IF EXISTS "Staff+ write whatsapp_owner_links" ON public.whatsapp_owner_links;
CREATE POLICY "Staff+ write whatsapp_owner_links"
  ON public.whatsapp_owner_links FOR INSERT
  WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::member_role[]));

DROP POLICY IF EXISTS "Staff+ update whatsapp_owner_links" ON public.whatsapp_owner_links;
CREATE POLICY "Staff+ update whatsapp_owner_links"
  ON public.whatsapp_owner_links FOR UPDATE
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::member_role[]));

DROP POLICY IF EXISTS "Staff+ delete whatsapp_owner_links" ON public.whatsapp_owner_links;
CREATE POLICY "Staff+ delete whatsapp_owner_links"
  ON public.whatsapp_owner_links FOR DELETE
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::member_role[]));

CREATE INDEX IF NOT EXISTS idx_whatsapp_owner_links_business_id
  ON public.whatsapp_owner_links(business_id);
