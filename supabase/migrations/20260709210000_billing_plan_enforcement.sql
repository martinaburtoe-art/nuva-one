-- Billing: adds real plan tracking to businesses, backed by Stripe, plus a
-- DB-level (not just UI-level) enforcement of the Starter plan's product
-- limit -- this closes the gap where anyone could create unlimited products
-- for free regardless of what the pricing page promises.

ALTER TABLE public.businesses
  ADD COLUMN plan text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro')),
  ADD COLUMN stripe_customer_id text,
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN subscription_status text NOT NULL DEFAULT 'active';

CREATE INDEX idx_businesses_stripe_customer_id ON public.businesses(stripe_customer_id);

-- Hard limit: Starter plan businesses cannot have more than 50 products.
-- This runs server-side on every insert, so it can't be bypassed by calling
-- the API directly -- only a real Pro subscription lifts it.
CREATE OR REPLACE FUNCTION public.enforce_product_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz_plan text;
  product_count integer;
BEGIN
  SELECT plan INTO biz_plan FROM public.businesses WHERE id = NEW.business_id;

  IF biz_plan = 'starter' THEN
    SELECT count(*) INTO product_count FROM public.products WHERE business_id = NEW.business_id;
    IF product_count >= 50 THEN
      RAISE EXCEPTION 'El plan Starter permite hasta 50 productos. Actualiza a Pro para agregar más.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_product_plan_limit
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_product_plan_limit();
