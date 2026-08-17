-- Nüva One Billing: Mercado Pago subscriptions.
-- Provider credentials and webhook writes are service-role only.

CREATE TABLE IF NOT EXISTS public.billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  monthly_amount NUMERIC(12,2) NOT NULL CHECK (monthly_amount > 0),
  annual_amount NUMERIC(12,2) NOT NULL CHECK (annual_amount > 0),
  currency TEXT NOT NULL DEFAULT 'CLP' CHECK (currency = 'CLP'),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.billing_plans (code, name, monthly_amount, annual_amount, metadata)
VALUES
  ('emprendedor', 'Emprendedor', 9990, 99900, '{"ai_monthly_limit":100,"max_users":1}'::jsonb),
  ('pro', 'Pro', 19990, 199900, '{"ai_monthly_limit":500,"max_users":3}'::jsonb),
  ('business', 'Business', 39990, 399900, '{"ai_monthly_limit":2000,"max_users":10}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_amount = EXCLUDED.monthly_amount,
  annual_amount = EXCLUDED.annual_amount,
  currency = EXCLUDED.currency,
  metadata = EXCLUDED.metadata,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.billing_plans(id),
  provider TEXT NOT NULL CHECK (provider = 'mercadopago'),
  provider_plan_id TEXT,
  provider_subscription_id TEXT,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month','year')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused','past_due','canceled')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_business
  ON public.billing_subscriptions (business_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_provider_plan
  ON public.billing_subscriptions (provider, provider_plan_id);

CREATE TABLE IF NOT EXISTS public.billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.billing_subscriptions(id) ON DELETE SET NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider = 'mercadopago'),
  provider_payment_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'CLP' CHECK (currency = 'CLP'),
  status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','refunded','charged_back')),
  paid_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_payments_business_created
  ON public.billing_payments (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_payments_subscription
  ON public.billing_payments (subscription_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider = 'mercadopago'),
  event_key TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_created
  ON public.billing_webhook_events (created_at DESC);

-- Provider state on the business row remains the compatibility source used by
-- the existing entitlement/trial enforcement logic.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS billing_provider TEXT,
  ADD COLUMN IF NOT EXISTS mercadopago_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS mercadopago_subscription_id TEXT;

REVOKE UPDATE ON public.businesses FROM authenticated;
GRANT UPDATE (
  name, industry, size, logo_url, tax_id, webhook_url, giro, address, comuna,
  public_contact_email, public_contact_phone, public_description, public_enabled,
  public_photos, public_slug, public_social_links
) ON public.businesses TO authenticated;

ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing plans readable" ON public.billing_plans;
CREATE POLICY "billing plans readable" ON public.billing_plans
  FOR SELECT TO authenticated USING (active = true);

DROP POLICY IF EXISTS "members read subscriptions" ON public.billing_subscriptions;
CREATE POLICY "members read subscriptions" ON public.billing_subscriptions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = billing_subscriptions.business_id
      AND bm.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "members read payments" ON public.billing_payments;
CREATE POLICY "members read payments" ON public.billing_payments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = billing_payments.business_id
      AND bm.user_id = auth.uid()
  ));

REVOKE ALL ON public.billing_webhook_events FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.billing_plans FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.billing_subscriptions FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.billing_payments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.billing_plans TO authenticated;
GRANT SELECT ON public.billing_subscriptions TO authenticated;
GRANT SELECT ON public.billing_payments TO authenticated;

-- Service role is intentionally the only writer for provider state.
GRANT ALL ON public.billing_plans TO service_role;
GRANT ALL ON public.billing_subscriptions TO service_role;
GRANT ALL ON public.billing_payments TO service_role;
GRANT ALL ON public.billing_webhook_events TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
