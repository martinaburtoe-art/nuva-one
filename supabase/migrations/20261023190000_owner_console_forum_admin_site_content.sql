-- Nüva One · Owner Console v1
-- Foro moderable por el propietario de la PLATAFORMA + contenido de sitio versionado
-- + auditoría de acciones administrativas + motor determinístico de alertas.
--
-- ADITIVO Y REVERSIBLE: cada sección puede revertirse restaurando las políticas
-- desde 20260811160000_public_forum_and_directory.sql (única política reemplazada:
-- "Public read forum_topics").
--
-- Autorización de propietario de plataforma: claim JWT app_metadata.platform_role='owner'
-- (el MISMO mecanismo ya usado en RLS de platform_expenses, 20260818090000).
-- No confundir con el rol 'owner' de un negocio cliente (member_role).

-- ════════════════════════════════════════════════════════════════════════
-- 1) Foro: moderación del propietario de plataforma
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.forum_topics
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft','published','unlisted')),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.forum_topics.is_pinned IS
  'Fijado por el propietario de la plataforma; aparece primero en el listado público.';
COMMENT ON COLUMN public.forum_topics.status IS
  'published: visible públicamente · draft: solo propietario de plataforma (borrador de moderación) · unlisted: retirado del listado público por moderación.';

CREATE INDEX IF NOT EXISTS idx_forum_topics_pinned
  ON public.forum_topics (is_pinned DESC, created_at DESC);

-- El listado público solo muestra 'published'; el propietario de plataforma ve todo
-- (necesario para moderar borradores y retirados).
DROP POLICY IF EXISTS "Public read forum_topics" ON public.forum_topics;
CREATE POLICY "Public read forum_topics"
  ON public.forum_topics FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    OR coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner'
  );

-- Moderación: SOLO el propietario de plataforma puede UPDATE (fijar, cambiar status,
-- editar contenido por corrección). Los miembros de negocio siguen sin poder editar
-- (diseño original: borrar y volver a publicar) y conservan su DELETE propio.
CREATE POLICY "Platform owner moderates forum_topics"
  ON public.forum_topics FOR UPDATE
  TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner')
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner');

-- ════════════════════════════════════════════════════════════════════════
-- 2) Auditoría de acciones administrativas (append-only para el owner)
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.owner_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (char_length(action) BETWEEN 3 AND 80),
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_admin_actions_created
  ON public.owner_admin_actions (created_at DESC);

ALTER TABLE public.owner_admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owner audit log" ON public.owner_admin_actions
  FOR ALL TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner')
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner');

COMMENT ON TABLE public.owner_admin_actions IS
  'Bitácora append-only de acciones de la Owner Console. No almacenar secretos ni datos personales de clientes aquí.';

-- ════════════════════════════════════════════════════════════════════════
-- 3) Contenido editable del sitio (CMS mínimo) + historial de versiones
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL UNIQUE CHECK (content_key ~ '^[a-z0-9_]{3,60}$'),
  title TEXT NOT NULL DEFAULT '',
  body JSONB NOT NULL DEFAULT '{}'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_content_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL REFERENCES public.site_content(content_key) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  body JSONB NOT NULL DEFAULT '{}'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  revision_note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_content_revisions_key
  ON public.site_content_revisions (content_key, created_at DESC);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content_revisions ENABLE ROW LEVEL SECURITY;

-- Público: solo contenido publicado. Propietario de plataforma: todo.
CREATE POLICY "Public read published site_content" ON public.site_content
  FOR SELECT TO anon, authenticated
  USING (published OR coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner');

CREATE POLICY "Platform owner manages site_content" ON public.site_content
  FOR ALL TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner')
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner');

-- El historial de versiones es administrativo: solo el propietario de plataforma.
CREATE POLICY "Platform owner reads site_content_revisions" ON public.site_content_revisions
  FOR SELECT TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner');

CREATE POLICY "Platform owner writes site_content_revisions" ON public.site_content_revisions
  FOR ALL TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner')
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner');

-- ════════════════════════════════════════════════════════════════════════
-- 4) Motor determinístico de alertas (umbrales configurables + incidentes)
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.owner_alert_thresholds (
  metric TEXT PRIMARY KEY CHECK (char_length(metric) BETWEEN 3 AND 60),
  comparison TEXT NOT NULL DEFAULT '>' CHECK (comparison IN ('>','<')),
  threshold_value NUMERIC NOT NULL CHECK (threshold_value >= 0),
  window_label TEXT NOT NULL DEFAULT 'rolling',
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT NOT NULL DEFAULT ''
);

COMMENT ON TABLE public.owner_alert_thresholds IS
  'Umbrales determinísticos de la Owner Console. Valores iniciales explícitos y editables por el propietario; no son requisitos del producto.';

-- Valores iniciales razonables, explícitos y ajustables desde la consola.
INSERT INTO public.owner_alert_thresholds (metric, comparison, threshold_value, window_label, severity, enabled, description) VALUES
  ('error_rate_5m', '>', 0.05, '5m', 'critical', true, 'Más del 5% de eventos operativos con error en 5 minutos.'),
  ('error_rate_1h', '>', 0.02, '1h', 'warning', true, 'Más del 2% de eventos operativos con error en 1 hora.'),
  ('latency_p95_ms', '>', 2000, '24h', 'warning', true, 'Latencia p95 sobre 2000 ms en la ventana de 24 horas.'),
  ('distinct_errors_24h', '>', 10, '24h', 'warning', true, 'Más de 10 errores distintos (fingerprints) en 24 horas.')
ON CONFLICT (metric) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.owner_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT NOT NULL UNIQUE,
  metric TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
  observed_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  comparison TEXT NOT NULL DEFAULT '>',
  window_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  occurrences INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_owner_incidents_status
  ON public.owner_incidents (status, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.owner_incident_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.owner_incidents(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('opened','occurrence','acknowledged','resolved','reopened')),
  observed_value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_incident_events_incident
  ON public.owner_incident_events (incident_id, created_at DESC);

ALTER TABLE public.owner_alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_incident_events ENABLE ROW LEVEL SECURITY;

-- Incidentes, historial y umbrales: exclusivos del propietario de plataforma.
CREATE POLICY "Platform owner manages owner_alert_thresholds" ON public.owner_alert_thresholds
  FOR ALL TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner')
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner');

CREATE POLICY "Platform owner manages owner_incidents" ON public.owner_incidents
  FOR ALL TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner')
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner');

CREATE POLICY "Platform owner manages owner_incident_events" ON public.owner_incident_events
  FOR ALL TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner')
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'owner');

-- ════════════════════════════════════════════════════════════════════════
-- 5) Grants explícitos
-- La pila moderna de Supabase NO otorga privilegios por defecto sobre tablas
-- nuevas a anon/authenticated (verificado ejecutando pgTAP local: 'permission
-- denied for table forum_topics'). RLS controla el acceso; los GRANTs lo hacen
-- posible. forum_topics nunca tuvo UPDATE grant (diseño original sin edición).
-- ════════════════════════════════════════════════════════════════════════

GRANT SELECT, UPDATE ON public.forum_topics TO authenticated;
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT SELECT, INSERT ON public.site_content_revisions TO authenticated;
GRANT SELECT, INSERT ON public.owner_admin_actions TO authenticated;
GRANT SELECT, UPDATE ON public.owner_alert_thresholds TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.owner_incidents TO authenticated;
GRANT SELECT, INSERT ON public.owner_incident_events TO authenticated;
