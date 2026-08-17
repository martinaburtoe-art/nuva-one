ALTER TABLE public.billing_plans
  ADD COLUMN IF NOT EXISTS mercadopago_monthly_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS mercadopago_annual_plan_id TEXT;

CREATE INDEX IF NOT EXISTS idx_billing_plans_mp_monthly
  ON public.billing_plans (mercadopago_monthly_plan_id)
  WHERE mercadopago_monthly_plan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_plans_mp_annual
  ON public.billing_plans (mercadopago_annual_plan_id)
  WHERE mercadopago_annual_plan_id IS NOT NULL;
