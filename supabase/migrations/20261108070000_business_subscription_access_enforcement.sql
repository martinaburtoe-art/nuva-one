-- Subscription-aware enforcement for the 15-day Starter trial.
-- Repair environments where the historical trial-hard-enforcement migration
-- is absent, and reconcile paid/pending subscription states with the UI.
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
  'Allows active paid subscriptions, Pro demo/current entitlement during pending checkout, and Starter trials within 15 days.';

CREATE OR REPLACE FUNCTION public.enforce_business_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE(public.business_is_active(NEW.business_id), false) THEN
    RAISE EXCEPTION 'Tu prueba gratuita de 15 días terminó. Elige un plan para seguir usando Nüva One.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_business_active() IS
  'Blocks new billable operational records when the business has no active paid subscription, Pro demo entitlement, or unexpired Starter trial.';

-- Install the guard idempotently. The production schema currently contains
-- seven of these operational tables; legacy marketing/automation tables are
-- included only when they exist in the target environment.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products', 'customers', 'suppliers', 'sales',
    'purchases', 'quotes', 'transactions', 'marketing_posts', 'automations'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM pg_trigger tr
        JOIN pg_class rel ON rel.oid = tr.tgrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        WHERE ns.nspname = 'public'
          AND rel.relname = t
          AND tr.tgname = 'trg_enforce_business_active'
          AND NOT tr.tgisinternal
      )
    THEN
      EXECUTE format(
        'CREATE TRIGGER trg_enforce_business_active BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_business_active()',
        t
      );
    END IF;
  END LOOP;
END $$;
