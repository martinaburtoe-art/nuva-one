-- Explicit deny-by-default policy for an internal grants table when present.
-- The guarded migration keeps clean environments compatible while making the
-- production intent explicit to security tooling.
DO $$
BEGIN
  IF to_regclass('public.owner_account_grants') IS NOT NULL THEN
    ALTER TABLE public.owner_account_grants ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.owner_account_grants FROM PUBLIC, anon, authenticated;
    DROP POLICY IF EXISTS owner_account_grants_deny_client_access ON public.owner_account_grants;
    CREATE POLICY owner_account_grants_deny_client_access
      ON public.owner_account_grants
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;
