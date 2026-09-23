-- Nüva People is private tenant data. Every business policy must require an authenticated session.
-- Previously several policies targeted the implicit `public` role; although their predicates
-- normally rejected auth.uid() = null, exposing the policy to anon was unnecessary attack surface.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename LIKE 'people_%'
      AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', r.policyname, r.tablename);
  END LOOP;
END $$;
