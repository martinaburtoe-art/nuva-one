-- Nüva Documents: secure, revocable customer links for quote review and acceptance.
-- Public access is mediated only by narrowly-scoped SECURITY DEFINER RPCs.
CREATE TABLE IF NOT EXISTS public.document_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  response_action TEXT CHECK (response_action IN ('accepted','rejected')),
  response_name TEXT,
  response_email TEXT,
  consent_text TEXT,
  responded_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT document_share_response_complete CHECK (
    (responded_at IS NULL AND response_action IS NULL AND response_name IS NULL
      AND response_email IS NULL AND consent_text IS NULL)
    OR
    (responded_at IS NOT NULL AND response_action IS NOT NULL
      AND response_name IS NOT NULL AND response_email IS NOT NULL AND consent_text IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS document_share_links_quote_idx
  ON public.document_share_links (business_id, quote_id, created_at DESC);
ALTER TABLE public.document_share_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_share_links_member_select ON public.document_share_links;
CREATE POLICY document_share_links_member_select ON public.document_share_links
  FOR SELECT USING (private.is_business_member(business_id, (SELECT auth.uid())));
REVOKE ALL ON public.document_share_links FROM PUBLIC, anon;
GRANT SELECT ON public.document_share_links TO authenticated;

CREATE TABLE IF NOT EXISTS public.document_share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES public.document_share_links(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('link_created','viewed','accepted','rejected','revoked')),
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(event_data) = 'object'),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_share_events_quote_idx
  ON public.document_share_events (business_id, quote_id, created_at DESC);
ALTER TABLE public.document_share_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_share_events_member_select ON public.document_share_events;
CREATE POLICY document_share_events_member_select ON public.document_share_events
  FOR SELECT USING (private.is_business_member(business_id, (SELECT auth.uid())));
REVOKE ALL ON public.document_share_events FROM PUBLIC, anon;
GRANT SELECT ON public.document_share_events TO authenticated;
GRANT SELECT ON public.document_share_events TO authenticated;

CREATE OR REPLACE FUNCTION public.create_quote_share_link(
  p_quote_id UUID, p_token TEXT, p_expires_at TIMESTAMPTZ
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE v_quote public.quotes%ROWTYPE; v_link_id UUID;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-fA-F]{64}$' THEN
    RAISE EXCEPTION 'Token de acceso inválido';
  END IF;
  IF p_expires_at IS NULL OR p_expires_at <= now() OR p_expires_at > now() + interval '90 days' THEN
    RAISE EXCEPTION 'La vigencia del enlace debe estar entre ahora y 90 días';
  END IF;
  SELECT q.* INTO v_quote FROM public.quotes q WHERE q.id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cotización no encontrada'; END IF;
  IF NOT private.has_business_role(v_quote.business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]) THEN
    RAISE EXCEPTION 'Sin permisos para compartir esta cotización';
  END IF;
  IF v_quote.status NOT IN ('draft','sent','viewed') OR v_quote.price_basis IS NULL THEN
    RAISE EXCEPTION 'La cotización debe estar preparada y tener modalidad de precios validada';
  END IF;
  IF v_quote.valid_until IS NOT NULL AND v_quote.valid_until < CURRENT_DATE THEN
    RAISE EXCEPTION 'La cotización está vencida';
  END IF;
  INSERT INTO public.document_share_links (business_id, quote_id, token_hash, expires_at, created_by)
  VALUES (v_quote.business_id, v_quote.id,
    encode(sha256(convert_to(lower(p_token), 'UTF8')), 'hex'), p_expires_at, auth.uid())
  RETURNING id INTO v_link_id;
  INSERT INTO public.document_share_events (business_id, quote_id, link_id, event_type, actor_id)
  VALUES (v_quote.business_id, v_quote.id, v_link_id, 'link_created', auth.uid());
  RETURN v_link_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_quote(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_link public.document_share_links%ROWTYPE; v_quote public.quotes%ROWTYPE; v_issuer JSONB;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-fA-F]{64}$' THEN RETURN NULL; END IF;
  SELECT l.* INTO v_link FROM public.document_share_links l
  WHERE l.token_hash = encode(sha256(convert_to(lower(p_token), 'UTF8')), 'hex')
  FOR UPDATE;
  IF NOT FOUND OR v_link.revoked_at IS NOT NULL OR v_link.expires_at <= now()
     OR v_link.responded_at IS NOT NULL THEN RETURN NULL; END IF;
  SELECT q.* INTO v_quote FROM public.quotes q
  WHERE q.id = v_link.quote_id AND q.business_id = v_link.business_id
  FOR UPDATE;
  IF NOT FOUND OR v_quote.status NOT IN ('draft','sent','viewed') THEN RETURN NULL; END IF;
  IF v_quote.valid_until IS NOT NULL AND v_quote.valid_until < CURRENT_DATE THEN RETURN NULL; END IF;
  IF v_quote.status IN ('draft','sent') THEN
    UPDATE public.quotes SET status = 'viewed' WHERE id = v_quote.id;
    v_quote.status := 'viewed';
  END IF;
  INSERT INTO public.document_share_events (business_id, quote_id, link_id, event_type)
  VALUES (v_link.business_id, v_quote.id, v_link.id, 'viewed');
  SELECT jsonb_build_object(
    'name', b.name, 'tax_id', b.tax_id, 'giro', b.giro, 'address', b.address,
    'comuna', b.comuna, 'logo_url', b.logo_url,
    'public_contact_email', b.public_contact_email, 'public_contact_phone', b.public_contact_phone
  ) INTO v_issuer FROM public.businesses b WHERE b.id = v_quote.business_id;
  RETURN jsonb_build_object(
    'quote_number', v_quote.quote_number, 'customer_name', v_quote.customer_name,
    'customer_snapshot', v_quote.customer_snapshot, 'subject', v_quote.subject,
    'items', v_quote.items, 'subtotal', v_quote.subtotal,
    'discount_pct', v_quote.discount_pct, 'tax', v_quote.tax, 'total', v_quote.total,
    'tax_treatment', v_quote.tax_treatment, 'vat_rate', v_quote.vat_rate,
    'price_basis', v_quote.price_basis, 'valid_until', v_quote.valid_until,
    'notes', v_quote.notes, 'terms', v_quote.terms, 'status', v_quote.status,
    'issuer', COALESCE(v_issuer, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_shared_quote(
  p_token TEXT, p_action TEXT, p_name TEXT, p_email TEXT, p_consent_text TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_link public.document_share_links%ROWTYPE; v_quote public.quotes%ROWTYPE;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-fA-F]{64}$' THEN
    RAISE EXCEPTION 'Enlace inválido o vencido';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('accepted','rejected') THEN RAISE EXCEPTION 'Respuesta inválida'; END IF;
  IF length(trim(COALESCE(p_name,''))) NOT BETWEEN 2 AND 160
     OR length(trim(COALESCE(p_email,''))) > 254
     OR trim(COALESCE(p_email,'')) !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     OR length(trim(COALESCE(p_consent_text,''))) NOT BETWEEN 20 AND 1000 THEN
    RAISE EXCEPTION 'Completa nombre, correo y consentimiento para registrar la respuesta';
  END IF;
  SELECT l.* INTO v_link FROM public.document_share_links l
  WHERE l.token_hash = encode(sha256(convert_to(lower(p_token), 'UTF8')), 'hex')
  FOR UPDATE;
  IF NOT FOUND OR v_link.revoked_at IS NOT NULL OR v_link.expires_at <= now()
     OR v_link.responded_at IS NOT NULL THEN RAISE EXCEPTION 'Enlace inválido, vencido o ya utilizado'; END IF;
  SELECT q.* INTO v_quote FROM public.quotes q
  WHERE q.id = v_link.quote_id AND q.business_id = v_link.business_id FOR UPDATE;
  IF NOT FOUND OR v_quote.status NOT IN ('draft','sent','viewed')
     OR (v_quote.valid_until IS NOT NULL AND v_quote.valid_until < CURRENT_DATE) THEN
    RAISE EXCEPTION 'La cotización ya no admite respuestas';
  END IF;
  UPDATE public.document_share_links SET response_action = p_action,
    response_name = trim(p_name), response_email = lower(trim(p_email)),
    consent_text = trim(p_consent_text), responded_at = now()
  WHERE id = v_link.id;
  UPDATE public.quotes SET status = p_action WHERE id = v_quote.id;
  INSERT INTO public.document_share_events (business_id, quote_id, link_id, event_type, event_data)
  VALUES (v_link.business_id, v_quote.id, v_link.id, p_action,
    jsonb_build_object('name', trim(p_name), 'email', lower(trim(p_email)),
      'consent_text', trim(p_consent_text), 'quote_number', v_quote.quote_number));
  RETURN jsonb_build_object('status', p_action, 'quote_number', v_quote.quote_number, 'responded_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_quote_share_link(p_link_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE v_link public.document_share_links%ROWTYPE;
BEGIN
  SELECT l.* INTO v_link FROM public.document_share_links l WHERE l.id = p_link_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF NOT private.has_business_role(v_link.business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]) THEN
    RAISE EXCEPTION 'Sin permisos para revocar este enlace';
  END IF;
  IF v_link.revoked_at IS NULL THEN
    UPDATE public.document_share_links SET revoked_at = now() WHERE id = p_link_id;
    INSERT INTO public.document_share_events (business_id, quote_id, link_id, event_type, actor_id)
    VALUES (v_link.business_id, v_link.quote_id, p_link_id, 'revoked', auth.uid());
  END IF;
  RETURN TRUE;
END;
$$;


CREATE OR REPLACE FUNCTION public.list_quote_share_links(p_quote_id UUID)
RETURNS TABLE (
  id UUID, expires_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ, response_action TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $
DECLARE v_business_id UUID;
BEGIN
  SELECT q.business_id INTO v_business_id FROM public.quotes q WHERE q.id = p_quote_id;
  IF NOT FOUND OR NOT private.has_business_role(
    v_business_id, auth.uid(), ARRAY['owner','admin','staff']::public.member_role[]
  ) THEN
    RAISE EXCEPTION 'Sin permisos para consultar enlaces de esta cotización';
  END IF;
  RETURN QUERY
    SELECT l.id, l.expires_at, l.revoked_at, l.responded_at, l.response_action, l.created_at
    FROM public.document_share_links l
    WHERE l.quote_id = p_quote_id AND l.business_id = v_business_id
    ORDER BY l.created_at DESC;
END;
$;

REVOKE ALL ON FUNCTION public.create_quote_share_link(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_shared_quote(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_to_shared_quote(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_quote_share_link(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_quote_share_links(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_quote_share_link(UUID, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_quote(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_shared_quote(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_quote_share_link(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_quote_share_links(UUID) TO authenticated;

COMMENT ON TABLE public.document_share_links IS
  'Hashed, revocable, expiring customer links for quote review. Raw tokens are never stored.';
COMMENT ON TABLE public.document_share_events IS
  'Append-only audit events for shared quote access and customer responses.';
