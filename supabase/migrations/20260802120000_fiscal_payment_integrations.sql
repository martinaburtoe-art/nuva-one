-- Generaliza billing_integrations/billing_documents (antes solo OpenFactura)
-- a un módulo agnóstico: OpenFactura, LibreDTE (fiscal) y Flow, VSB (pago).
-- Las credenciales (api_key/secret_key) se guardan cifradas por la app
-- (AES-256-GCM, ver src/lib/fiscal/crypto.server.ts) antes del insert; la DB
-- nunca ve la clave en texto plano desde este punto en adelante.

ALTER TABLE public.billing_integrations
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'fiscal' CHECK (type IN ('fiscal','payment')),
  ADD COLUMN IF NOT EXISTS api_url TEXT,
  ADD COLUMN IF NOT EXISTS secret_key TEXT,
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.billing_integrations DROP CONSTRAINT IF EXISTS billing_integrations_provider_check;
ALTER TABLE public.billing_integrations
  ADD CONSTRAINT billing_integrations_provider_check
  CHECK (provider IN ('openfactura','libredte','flow','vsb'));

-- Un negocio puede tener credenciales guardadas de varios proveedores (para
-- comparar / migrar), pero solo UNA conexión activa por tipo (fiscal/pago) a
-- la vez -- así nunca se mezclan folios ni credenciales entre proveedores.
-- Se mantiene UNIQUE(business_id, provider) (ya existía) como target del
-- upsert: cada negocio guarda como máximo una fila de credenciales por
-- proveedor (histórico), y la que esté "connected" es la única activa por
-- tipo gracias al índice parcial de abajo.
DROP INDEX IF EXISTS idx_billing_integrations_one_active_per_type;
CREATE UNIQUE INDEX idx_billing_integrations_one_active_per_type
  ON public.billing_integrations (business_id, type)
  WHERE status = 'connected';

ALTER TABLE public.billing_documents
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

DROP INDEX IF EXISTS idx_billing_documents_idempotency;
CREATE UNIQUE INDEX idx_billing_documents_idempotency
  ON public.billing_documents (business_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Cola de emisión en segundo plano: para venta masiva desde confección, el
-- endpoint /emit-bulk encola filas aquí y un worker (process-queue, invocado
-- por cron) las procesa de a poco respetando el rate limit del proveedor.
CREATE TABLE IF NOT EXISTS public.billing_emit_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | done | failed
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  document_id UUID REFERENCES public.billing_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, idempotency_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_emit_queue TO authenticated;
GRANT ALL ON public.billing_emit_queue TO service_role;

ALTER TABLE public.billing_emit_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read billing_emit_queue" ON public.billing_emit_queue
  FOR SELECT USING (private.is_business_member(business_id, auth.uid()));
CREATE POLICY "Staff+ write billing_emit_queue" ON public.billing_emit_queue
  FOR INSERT WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::member_role[]));
CREATE POLICY "Staff+ update billing_emit_queue" ON public.billing_emit_queue
  FOR UPDATE USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin','staff']::member_role[]));

CREATE INDEX IF NOT EXISTS idx_billing_emit_queue_pending
  ON public.billing_emit_queue (status, created_at) WHERE status = 'pending';

DROP TRIGGER IF EXISTS trg_audit_billing_emit_queue ON public.billing_emit_queue;
CREATE TRIGGER trg_audit_billing_emit_queue
  AFTER INSERT OR UPDATE OR DELETE ON public.billing_emit_queue
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

-- Registro crudo de confirmaciones de pago recibidas (Flow/VSB), solo
-- accesible por service_role (el webhook usa supabaseAdmin, no JWT de usuario).
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  token TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.payment_webhook_events TO service_role;
