-- Stripe no opera con cuentas bancarias chilenas (Chile está en "preview",
-- sin payouts habilitados) -- la suscripción Pro de Nüva One se cobra con
-- Flow (Cargo Automático / Suscripciones), el mismo proveedor ya integrado
-- para que los negocios cobren a SUS clientes. Las columnas stripe_* se
-- dejan intactas por si algún día se retoma Stripe (ej. vía Stripe Atlas).

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS flow_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS flow_card_status TEXT NOT NULL DEFAULT 'none'
    CHECK (flow_card_status IN ('none','pending','active','failed')),
  ADD COLUMN IF NOT EXISTS next_charge_date DATE,
  ADD COLUMN IF NOT EXISTS billing_failed_attempts INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_businesses_flow_customer_id ON public.businesses(flow_customer_id);
CREATE INDEX IF NOT EXISTS idx_businesses_next_charge_date ON public.businesses(next_charge_date)
  WHERE plan = 'pro';

-- Registro histórico de cada intento de cobro mensual (éxito o rechazo),
-- separado de payment_intents (que es para cobros de los NEGOCIOS a SUS
-- clientes, no para lo que Nüva One le cobra al negocio por el plan Pro).
CREATE TABLE IF NOT EXISTS public.subscription_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  commerce_order TEXT NOT NULL UNIQUE,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid','rejected')),
  flow_order TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view subscription_charges" ON public.subscription_charges
  FOR SELECT USING (private.is_business_member(business_id, auth.uid()));

GRANT SELECT ON public.subscription_charges TO authenticated;
GRANT ALL ON public.subscription_charges TO service_role;
