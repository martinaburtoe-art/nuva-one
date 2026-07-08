DROP POLICY IF EXISTS "Members see business" ON public.businesses;
DROP POLICY IF EXISTS "Members or owner see business" ON public.businesses;

CREATE POLICY "Members or owner see business"
ON public.businesses
FOR SELECT
USING (
  auth.uid() = owner_id
  OR private.is_business_member(id, auth.uid())
);