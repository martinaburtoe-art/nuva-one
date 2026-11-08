-- Reconcile the 15-day Starter trial boundary with real subscription state.
-- A paid Starter subscriber must not be locked after day 15. Paused and
-- cancelled subscriptions lose access; a pending checkout may preserve an
-- existing Pro/demo entitlement or an unexpired Starter trial, but never extend it.
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
  'Returns whether billable business writes are allowed: active paid subscriptions, Pro entitlement during active/pending checkout, or an unexpired Starter trial during active/pending checkout.';
