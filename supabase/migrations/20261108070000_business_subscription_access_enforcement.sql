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


-- The original trial-hardening migration is present in the repository but is
-- absent from the production migration ledger and its trigger/function are not
-- installed there. Recreate the enforcement boundary here instead of assuming
-- a historical migration ran successfully.
CREATE OR REPLACE FUNCTION public.enforce_business_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE(public.business_is_active(NEW.business_id), false) THEN
    RAISE EXCEPTION 'Tu prueba gratuita de 15 días terminó. Actualiza a Pro para seguir usando Nüva One.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

-- Only install triggers on billable operational tables that actually exist
-- in this schema. Do not reference legacy marketing/automation tables that
-- are not part of the current production schema.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products', 'customers', 'suppliers', 'sales',
    'purchases', 'quotes', 'transactions'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_business_active ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_enforce_business_active BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_business_active()',
        t
      );
    END IF;
  END LOOP;
END
$$;

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

-- Install the guard idempotently. This also repairs environments where the
-- historical 20260719000000 migration was never applied.
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
