-- Nüva Documents: reusable, business-scoped document presentation templates.
-- These settings affect commercial PDFs only; they never change tax treatment or legal document status.

CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  document_kind TEXT NOT NULL DEFAULT 'all' CHECK (document_kind IN ('all','quote','invoice')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  design JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(design) = 'object'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT document_templates_business_name_unique UNIQUE (business_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS document_templates_one_default_per_kind
  ON public.document_templates (business_id, document_kind)
  WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS document_templates_business_kind_idx
  ON public.document_templates (business_id, document_kind, is_default DESC, updated_at DESC);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_templates_member_select ON public.document_templates;
CREATE POLICY document_templates_member_select ON public.document_templates
  FOR SELECT USING ((SELECT private.is_business_member(business_id, (SELECT auth.uid()))));

DROP POLICY IF EXISTS document_templates_admin_insert ON public.document_templates;
CREATE POLICY document_templates_admin_insert ON public.document_templates
  FOR INSERT WITH CHECK (
    (created_by IS NULL OR created_by = (SELECT auth.uid()))
    AND private.has_business_role(
      business_id, (SELECT auth.uid()), ARRAY['owner','admin']::public.member_role[]
    )
  );

DROP POLICY IF EXISTS document_templates_admin_update ON public.document_templates;
CREATE POLICY document_templates_admin_update ON public.document_templates
  FOR UPDATE
  USING (private.has_business_role(
    business_id, (SELECT auth.uid()), ARRAY['owner','admin']::public.member_role[]
  ))
  WITH CHECK (private.has_business_role(
    business_id, (SELECT auth.uid()), ARRAY['owner','admin']::public.member_role[]
  ));

DROP POLICY IF EXISTS document_templates_admin_delete ON public.document_templates;
CREATE POLICY document_templates_admin_delete ON public.document_templates
  FOR DELETE USING (private.has_business_role(
    business_id, (SELECT auth.uid()), ARRAY['owner','admin']::public.member_role[]
  ));

REVOKE ALL ON public.document_templates FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.document_templates FROM authenticated;
GRANT SELECT ON public.document_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.document_templates TO authenticated;

COMMENT ON TABLE public.document_templates IS
  'Business-scoped presentation settings for Nüva commercial PDFs. Not tax-document configuration.';
