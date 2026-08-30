-- Nüva Studio: provider-agnostic AI tool registry, generation jobs and asset library.
-- Provider secrets are never stored here; keep credentials in server environment variables.

CREATE TABLE IF NOT EXISTS public.ai_tool_registry (
  id text PRIMARY KEY,
  label text NOT NULL,
  capability text NOT NULL,
  provider text NOT NULL,
  model text,
  enabled boolean NOT NULL DEFAULT true,
  cost_units integer NOT NULL DEFAULT 1 CHECK (cost_units >= 0),
  plans text[] NOT NULL DEFAULT ARRAY['free','pro','business','enterprise']::text[],
  daily_limit integer CHECK (daily_limit IS NULL OR daily_limit >= 0),
  monthly_limit integer CHECK (monthly_limit IS NULL OR monthly_limit >= 0),
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id text REFERENCES public.ai_tool_registry(id) ON DELETE SET NULL,
  capability text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  prompt text NOT NULL,
  input_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider text,
  model text,
  units_charged integer NOT NULL DEFAULT 0 CHECK (units_charged >= 0),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS ai_generation_jobs_business_created_idx
  ON public.ai_generation_jobs (business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_asset_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.ai_generation_jobs(id) ON DELETE SET NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('image','video','audio','document','copy','campaign','brand')),
  title text NOT NULL,
  storage_path text,
  public_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_asset_library_business_created_idx
  ON public.ai_asset_library (business_id, created_at DESC);

ALTER TABLE public.ai_tool_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_asset_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AI tool registry readable by authenticated users" ON public.ai_tool_registry;
CREATE POLICY "AI tool registry readable by authenticated users"
  ON public.ai_tool_registry FOR SELECT TO authenticated USING (enabled = true);

DROP POLICY IF EXISTS "Members view own generation jobs" ON public.ai_generation_jobs;
CREATE POLICY "Members view own generation jobs"
  ON public.ai_generation_jobs FOR SELECT TO authenticated
  USING (private.is_business_member(business_id, auth.uid()));

DROP POLICY IF EXISTS "Members create own generation jobs" ON public.ai_generation_jobs;
CREATE POLICY "Members create own generation jobs"
  ON public.ai_generation_jobs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND private.is_business_member(business_id, auth.uid()));

DROP POLICY IF EXISTS "Members view own assets" ON public.ai_asset_library;
CREATE POLICY "Members view own assets"
  ON public.ai_asset_library FOR SELECT TO authenticated
  USING (private.is_business_member(business_id, auth.uid()));

DROP POLICY IF EXISTS "Members create own assets" ON public.ai_asset_library;
CREATE POLICY "Members create own assets"
  ON public.ai_asset_library FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND private.is_business_member(business_id, auth.uid()));

INSERT INTO public.ai_tool_registry
  (id, label, capability, provider, model, cost_units, plans, daily_limit, monthly_limit, description)
VALUES
  ('agent.chat','Nüva Agent','chat','google','gemini-3.1-pro-preview',1,ARRAY['free','pro','business','enterprise'],20,300,'Asistente empresarial con memoria y contexto.'),
  ('studio.research','Investigación inteligente','research','google','gemini-3.1-pro-preview',3,ARRAY['free','pro','business','enterprise'],5,30,'Investigación y síntesis para decisiones.'),
  ('studio.marketing','Nüva Marketing','marketing','google','gemini-3.1-pro-preview',2,ARRAY['free','pro','business','enterprise'],3,20,'Campañas, calendarios y estrategias.'),
  ('studio.copywriting','Generador de contenido','copywriting','google','gemini-3.1-pro-preview',1,ARRAY['free','pro','business','enterprise'],10,100,'Copies, slogans y guiones.'),
  ('studio.image','Nüva Creative','image','google','gemini-2.5-flash-image',5,ARRAY['free','pro','business','enterprise'],2,10,'Piezas visuales y fotografía de producto.'),
  ('studio.voice','Nüva Voice','voice','fish_audio',NULL,2,ARRAY['free','pro','business','enterprise'],5,30,'Locuciones para campañas.'),
  ('studio.video','Nüva Video','video','n8n',NULL,20,ARRAY['pro','business','enterprise'],2,15,'Pipeline audiovisual orquestado.'),
  ('studio.brand','Brand DNA','brand','google','gemini-3.1-pro-preview',3,ARRAY['free','pro','business','enterprise'],NULL,10,'Sistema de identidad y consistencia de marca.'),
  ('studio.automation','Nüva Automate','automation','n8n',NULL,5,ARRAY['pro','business','enterprise'],NULL,50,'Flujos de trabajo automáticos.')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  capability = EXCLUDED.capability,
  provider = EXCLUDED.provider,
  model = EXCLUDED.model,
  cost_units = EXCLUDED.cost_units,
  plans = EXCLUDED.plans,
  daily_limit = EXCLUDED.daily_limit,
  monthly_limit = EXCLUDED.monthly_limit,
  description = EXCLUDED.description,
  updated_at = now();
