-- Reconcile the 15-day Starter trial boundary with real subscription state.
-- A paid Starter subscriber must not be locked after day 15; paused, cancelled,
-- or pending subscriptions must not keep billable writes open. The no-payment
-- Pro business is the explicit demo experience.
CREATE OR REPLACE FUNCTION public.business_is_active(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT
      b.subscription_status IN ('active', 'pending')
      AND (
        (b.subscription_status = 'active' AND COALESCE(b.billing_provider, 'none') <> 'none')
        OR b.plan = 'pro'
        OR (
          b.plan = 'starter'
          AND b.created_at > now() - interval '15 days'
        )
      )
    FROM public.businesses b
    WHERE b.id = p_business_id
  ), false);
$$;

COMMENT ON FUNCTION public.business_is_active(uuid) IS
  'Returns whether billable business writes are allowed: active paid subscriptions, active Pro demo, or active Starter trial within 15 days.';
