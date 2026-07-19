-- Billing: real ("hard") enforcement of the 15-day free trial cutoff.
--
-- Until now, trial expiration was only checked client-side (dashboard-shell.tsx
-- / settings.tsx compute trialDaysLeft from businesses.created_at and hide the
-- app behind TrialExpiredScreen). That's a UI convenience, not a security
-- boundary: any signed-in user whose trial ended could keep calling the API
-- directly with a valid JWT and write data forever on the Starter plan. This
-- migration closes that gap at the database level, the same way
-- enforce_product_plan_limit() already closed it for the 50-product cap.
--
-- business_is_active() intentionally mirrors the exact trial math already
-- duplicated in the frontend (created_at + 15 days) so the DB and UI can
-- never disagree about whether a business is inside its trial.
CREATE OR REPLACE FUNCTION public.business_is_active(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT plan = 'pro' OR created_at > now() - interval '15 days'
  FROM public.businesses
  WHERE id = p_business_id;
$$;

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

-- Applied to every table where new writes represent billable app usage.
-- Deliberately NOT applied to:
--   - businesses / business_members: owners must still be able to log in,
--     see the paywall, and manage their team/subscription after trial ends.
--   - audit_log: system-inserted only, and already insert-only/RLS-restricted.
--   - whatsapp_connections / whatsapp_messages / device_tokens: infrastructure
--     rows, not themselves a billable action.
--   - ai_usage_daily: already rate-limited separately in increment_ai_usage().
-- Only gates INSERT (not UPDATE/DELETE): a business past its trial shouldn't
-- be able to create new records, but should still be able to close out or
-- correct what it already has (e.g. mark an existing quote as accepted).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products', 'customers', 'suppliers', 'sales',
    'purchases', 'quotes', 'transactions', 'marketing_posts', 'automations'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_enforce_business_active BEFORE INSERT ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.enforce_business_active();',
      t
    );
  END LOOP;
END $$;
