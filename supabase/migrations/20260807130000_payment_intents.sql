-- Cobros online (Flow/VSB): registra cada intento de pago creado desde
-- /api/billing/payments/create. El webhook (/api/billing/payments/webhook)
-- SOLO puede marcar un pago como pagado si encuentra la fila aquí y verifica
-- el estado real contra el proveedor (server-to-server) -- nunca confía en
-- el POST recibido por sí solo. El UNIQUE(provider, token) + status hacen
-- que reintentos del mismo webhook nunca dupliquen el abono en `payments`.

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('flow','vsb')),
  token TEXT NOT NULL,
  commerce_order TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (provider, token)
);

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view payment_intents" ON public.payment_intents
  FOR SELECT USING (private.is_business_member(business_id, auth.uid()));

-- Solo el service_role (webhook con supabaseAdmin) puede insertar/actualizar
-- el estado real de un pago; el cliente autenticado nunca escribe aquí
-- directamente (evita que alguien se auto-marque como "pagado").
GRANT SELECT ON public.payment_intents TO authenticated;
GRANT ALL ON public.payment_intents TO service_role;

CREATE INDEX IF NOT EXISTS idx_payment_intents_token ON public.payment_intents (provider, token);
CREATE INDEX IF NOT EXISTS idx_payment_intents_sale ON public.payment_intents (sale_id);

DROP TRIGGER IF EXISTS trg_audit_payment_intents ON public.payment_intents;
CREATE TRIGGER trg_audit_payment_intents
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

-- Idempotencia dura a nivel de webhook: evita procesar el mismo evento crudo
-- dos veces aunque el proveedor reintente la notificación.
ALTER TABLE public.payment_webhook_events
  ADD COLUMN IF NOT EXISTS processed BOOLEAN NOT NULL DEFAULT false;
DROP INDEX IF EXISTS idx_payment_webhook_events_unique;
CREATE UNIQUE INDEX idx_payment_webhook_events_unique
  ON public.payment_webhook_events (provider, token);
