-- Nüva Billing: provider-agnostic subscription model.
-- Mercado Pago is the first production provider; provider IDs are kept external
-- so Stripe/other providers can be added later without changing entitlements.

CREATE TABLE IF NOT EXISTS public.billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'CLP',
  monthly_amount INTEGER NOT NULL CHECK (monthly_amount >= 0),
  annual_amount INTEGER CHECK (annual_amount IS NULL OR annual_amount >= 0),
  ai_monthly_limit INTEGER NOT NULL DEFAULT 0 CHECK (ai_monthly_limit >= 0),
  max_users INTEGER NOT NULL DEFAULT 1 CHECK (max_users >= 1),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.billing_plans(id),
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  provider_subscription_id TEXT,
  provider_plan_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','pending','active','paused','past_due','canceled','expired')),
  billing_interval TEXT NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month','year')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_subscription_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_one_current_subscription
ON public.billing_subscriptions(business_id)
WHERE status IN ('trialing','pending','active','paused','past_due');

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_business ON public.billing_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_status ON public.billing_subscriptions(status);

CREATE TABLE IF NOT EXISTS public.billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.billing_subscriptions(id) ON DELETE SET NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'CLP',
  status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','refunded','charged_back','canceled')),
  paid_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_payments_business ON public.billing_payments(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_payments_status ON public.billing_payments(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_key TEXT NOT NULL,
  topic TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, event_key)
);

CREATE INDEX IF NOT EXISTS idx_billing_webhooks_pending ON public.billing_webhook_events(processed, created_at);

INSERT INTO public.billing_plans (code, name, description, monthly_amount, annual_amount, ai_monthly_limit, max_users, features)
VALUES
('starter', 'Emprendedor', 'Para comenzar a ordenar tu negocio', 9990, 99900, 100, 1, '{"crm":true,"cash":true,"sales":true,"inventory_basic":true,"reports_basic":true,"automations":false}'),
('pro', 'Pro', 'Para negocios que están creciendo', 19990, 199900, 500, 3, '{"crm":true,"cash":true,"sales":true,"inventory_basic":true,"inventory_advanced":true,"reports_basic":true,"reports_advanced":true,"automations":true}'),
('business', 'Business', 'Para empresas que necesitan control y automatización', 39990, 399900, 2000, 10, '{"crm":true,"cash":true,"sales":true,"inventory_basic":true,"inventory_advanced":true,"reports_basic":true,"reports_advanced":true,"automations":true,"priority_support":true}')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_amount = EXCLUDED.monthly_amount,
  annual_amount = EXCLUDED.annual_amount,
  ai_monthly_limit = EXCLUDED.ai_monthly_limit,
  max_users = EXCLUDED.max_users,
  features = EXCLUDED.features,
  updated_at = now();

ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;

-- Plans are public catalog data; subscriptions/payments are tenant-private.
DROP POLICY IF EXISTS billing_plans_read_active ON public.billing_plans;
CREATE POLICY billing_plans_read_active ON public.billing_plans FOR SELECT TO authenticated USING (active = true);

DROP POLICY IF EXISTS billing_subscriptions_tenant_read ON public.billing_subscriptions;
CREATE POLICY billing_subscriptions_tenant_read ON public.billing_subscriptions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = billing_subscriptions.business_id AND bm.user_id = auth.uid()));

DROP POLICY IF EXISTS billing_payments_tenant_read ON public.billing_payments;
CREATE POLICY billing_payments_tenant_read ON public.billing_payments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = billing_payments.business_id AND bm.user_id = auth.uid()));

REVOKE ALL ON public.billing_webhook_events FROM anon, authenticated;
GRANT SELECT ON public.billing_plans TO authenticated;
GRANT SELECT ON public.billing_subscriptions, public.billing_payments TO authenticated;
