-- Performance hardening: cover the FK used by owner-account grant auditing.
-- owner_account_grants is an internal/optional table in some historical
-- installations, so keep the migration safe for clean rebuilds where the
-- table is intentionally absent.
DO $$
BEGIN
  IF to_regclass('public.owner_account_grants') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_owner_account_grants_granted_by
      ON public.owner_account_grants (granted_by);
  END IF;
END $$;
