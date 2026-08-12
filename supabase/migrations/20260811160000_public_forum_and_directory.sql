-- Foro público + directorio público de negocios.
--
-- Objetivo (pedido por Martín, 11-08-2026): que cualquier dueño de negocio
-- con cuenta en Nüva One (aunque esté en trial) pueda publicar temas y
-- respuestas visibles para todo internet -- sirve para generar contactos
-- entre dueños Y para que Google indexe contenido real con palabras clave
-- de PyMEs chilenas (SEO). El directorio de negocios es la contraparte:
-- un negocio puede opcionalmente exponer un perfil público (nombre, rubro,
-- descripción corta) enlazado desde sus posts del foro.
--
-- Decisiones de moderación (explícitas, pedidas así por Martín):
--   - Publicación instantánea, sin revisión previa.
--   - Cualquier miembro de un negocio puede borrar los posts/respuestas
--     publicados POR SU PROPIO negocio (no los de otros).
--   - Sin editar por ahora (evita drift entre lo indexado por Google y lo
--     mostrado); borrar y volver a publicar si hace falta corregir.

-- 1) Perfil público opcional del negocio -----------------------------------
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS public_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS public_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_description TEXT;

COMMENT ON COLUMN public.businesses.public_slug IS
  'Slug único para la URL pública /negocios/:slug. Null hasta que el dueño activa el perfil público.';
COMMENT ON COLUMN public.businesses.public_enabled IS
  'Si es true, el negocio aparece en el directorio público y su nombre/rubro se muestra junto a sus posts del foro.';

-- Lectura pública: en vez de agregar una policy RLS permisiva sobre la
-- tabla businesses (eso expondría tax_id, webhook_url y owner_id a
-- CUALQUIER usuario autenticado de la plataforma, no solo al público),
-- se expone una vista con solo las columnas seguras. RLS de businesses NO
-- se toca -- sigue exactamente como estaba.
CREATE OR REPLACE VIEW public.businesses_public AS
SELECT id, name, industry, public_slug, public_description, created_at
FROM public.businesses
WHERE public_enabled = true;

GRANT SELECT ON public.businesses_public TO anon, authenticated;

-- 2) Temas del foro ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  -- Denormalizado a propósito: el foro necesita mostrar "quién pregunta"
  -- (nombre + rubro del negocio) sin depender de que ese negocio haya
  -- activado su perfil público (public_enabled) ni de exponer la tabla
  -- businesses completa vía RLS. Se copia una sola vez al crear el post.
  business_name TEXT NOT NULL,
  business_industry TEXT,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 150),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 10 AND 5000),
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('general','ventas','marketing','finanzas','operaciones','tecnologia','legal')),
  reply_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forum_topics_created_at ON public.forum_topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_category ON public.forum_topics(category);
CREATE INDEX IF NOT EXISTS idx_forum_topics_business_id ON public.forum_topics(business_id);

ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read forum_topics" ON public.forum_topics;
CREATE POLICY "Public read forum_topics"
  ON public.forum_topics FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Members create forum_topics" ON public.forum_topics;
CREATE POLICY "Members create forum_topics"
  ON public.forum_topics FOR INSERT
  TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND private.is_business_member(business_id, auth.uid())
  );

DROP POLICY IF EXISTS "Business members delete own forum_topics" ON public.forum_topics;
CREATE POLICY "Business members delete own forum_topics"
  ON public.forum_topics FOR DELETE
  TO authenticated
  USING (private.is_business_member(business_id, auth.uid()));

-- 3) Respuestas ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 2 AND 3000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_topic_id ON public.forum_replies(topic_id, created_at);

ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read forum_replies" ON public.forum_replies;
CREATE POLICY "Public read forum_replies"
  ON public.forum_replies FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Members create forum_replies" ON public.forum_replies;
CREATE POLICY "Members create forum_replies"
  ON public.forum_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND private.is_business_member(business_id, auth.uid())
  );

DROP POLICY IF EXISTS "Business members delete own forum_replies" ON public.forum_replies;
CREATE POLICY "Business members delete own forum_replies"
  ON public.forum_replies FOR DELETE
  TO authenticated
  USING (private.is_business_member(business_id, auth.uid()));

-- Mantiene reply_count sincronizado sin depender de que el cliente lo
-- recalcule -- así el conteo mostrado en el listado del foro (que se pide
-- sin traer todas las respuestas) siempre es correcto.
CREATE OR REPLACE FUNCTION public.forum_sync_reply_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_topics SET reply_count = reply_count + 1 WHERE id = NEW.topic_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_topics SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.topic_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_forum_sync_reply_count ON public.forum_replies;
CREATE TRIGGER trg_forum_sync_reply_count
  AFTER INSERT OR DELETE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.forum_sync_reply_count();

GRANT SELECT ON public.forum_topics, public.forum_replies TO anon, authenticated;
GRANT INSERT, DELETE ON public.forum_topics, public.forum_replies TO authenticated;
