-- Avoid two permissive authenticated SELECT policies while preserving the exact
-- semantics: authenticated users can see their businesses and public showcases;
-- anonymous users can only see public showcases.
DROP POLICY IF EXISTS "Members or owner see business" ON public.businesses;
DROP POLICY IF EXISTS "Public showcase businesses" ON public.businesses;

CREATE POLICY "Authenticated business visibility"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (
    public_enabled = true
    OR (select auth.uid()) = owner_id
    OR private.is_business_member(id, (select auth.uid()))
  );

CREATE POLICY "Anonymous public showcase"
  ON public.businesses
  FOR SELECT
  TO anon
  USING (public_enabled = true);
