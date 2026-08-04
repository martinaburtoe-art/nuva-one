-- Tabla de alertas a nivel de sistema (no por negocio), para fallas de
-- infraestructura que hoy solo quedaban en console.error de una función
-- serverless (invisible fuera de los logs de Vercel). Ejemplo: el
-- rate-limiter cae en "fail-open" cuando check_rate_limit no responde --
-- eso debía dejar rastro consultable, no solo un log efímero.
--
-- No lleva business_id porque el origen puede no ser de un negocio
-- específico (p.ej. errores de infra genéricos). Solo accesible por
-- service_role: no hay caso de uso para que un usuario final la lea.
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Sin políticas para authenticated/anon a propósito: por defecto RLS niega
-- todo. Solo service_role (que bypassa RLS) puede leer/escribir.
GRANT ALL ON public.system_alerts TO service_role;

CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at
  ON public.system_alerts(created_at DESC);
