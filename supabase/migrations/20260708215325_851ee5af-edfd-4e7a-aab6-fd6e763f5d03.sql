-- Move SECURITY DEFINER helper functions out of the public API schema so they
-- cannot be invoked directly by signed-in users via PostgREST RPC. They stay
-- callable from RLS policies because we update the policies to reference the
-- private-schema functions.

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon;

-- Recreate helpers in the private schema (same bodies).
CREATE OR REPLACE FUNCTION private.is_business_member(_business_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.business_members
    WHERE business_id = _business_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION private.has_business_role(_business_id uuid, _user_id uuid, _roles member_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.business_members
    WHERE business_id = _business_id AND user_id = _user_id AND role = ANY(_roles)
  );
$$;

-- Recreate every RLS policy that referenced the public versions, pointing at
-- private.* instead. Drops-then-creates so we can safely drop the public fns.

-- businesses
DROP POLICY IF EXISTS "Members see business" ON public.businesses;
CREATE POLICY "Members see business" ON public.businesses
  FOR SELECT USING (private.is_business_member(id, auth.uid()));

-- business_members
DROP POLICY IF EXISTS "Members see members" ON public.business_members;
CREATE POLICY "Members see members" ON public.business_members
  FOR SELECT USING (private.is_business_member(business_id, auth.uid()));

DROP POLICY IF EXISTS "Owner/admin insert members" ON public.business_members;
CREATE POLICY "Owner/admin insert members" ON public.business_members
  FOR INSERT WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

DROP POLICY IF EXISTS "Owner/admin update members" ON public.business_members;
CREATE POLICY "Owner/admin update members" ON public.business_members
  FOR UPDATE USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

DROP POLICY IF EXISTS "Owner/admin or self delete members" ON public.business_members;
CREATE POLICY "Owner/admin or self delete members" ON public.business_members
  FOR DELETE USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]) OR user_id = auth.uid());

-- customers
DROP POLICY IF EXISTS "Members access customers" ON public.customers;
CREATE POLICY "Members access customers" ON public.customers
  FOR ALL USING (private.is_business_member(business_id, auth.uid()))
  WITH CHECK (private.is_business_member(business_id, auth.uid()));

-- suppliers
DROP POLICY IF EXISTS "Members access suppliers" ON public.suppliers;
CREATE POLICY "Members access suppliers" ON public.suppliers
  FOR ALL USING (private.is_business_member(business_id, auth.uid()))
  WITH CHECK (private.is_business_member(business_id, auth.uid()));

-- products
DROP POLICY IF EXISTS "Members access products" ON public.products;
CREATE POLICY "Members access products" ON public.products
  FOR ALL USING (private.is_business_member(business_id, auth.uid()))
  WITH CHECK (private.is_business_member(business_id, auth.uid()));

-- sales
DROP POLICY IF EXISTS "Members access sales" ON public.sales;
CREATE POLICY "Members access sales" ON public.sales
  FOR ALL USING (private.is_business_member(business_id, auth.uid()))
  WITH CHECK (private.is_business_member(business_id, auth.uid()));

-- purchases
DROP POLICY IF EXISTS "Members access purchases" ON public.purchases;
CREATE POLICY "Members access purchases" ON public.purchases
  FOR ALL USING (private.is_business_member(business_id, auth.uid()))
  WITH CHECK (private.is_business_member(business_id, auth.uid()));

-- transactions
DROP POLICY IF EXISTS "Members access transactions" ON public.transactions;
CREATE POLICY "Members access transactions" ON public.transactions
  FOR ALL USING (private.is_business_member(business_id, auth.uid()))
  WITH CHECK (private.is_business_member(business_id, auth.uid()));

-- quotes
DROP POLICY IF EXISTS "Members access quotes" ON public.quotes;
CREATE POLICY "Members access quotes" ON public.quotes
  FOR ALL USING (private.is_business_member(business_id, auth.uid()))
  WITH CHECK (private.is_business_member(business_id, auth.uid()));

-- automations
DROP POLICY IF EXISTS "Members access automations" ON public.automations;
CREATE POLICY "Members access automations" ON public.automations
  FOR ALL USING (private.is_business_member(business_id, auth.uid()))
  WITH CHECK (private.is_business_member(business_id, auth.uid()));

-- marketing_posts
DROP POLICY IF EXISTS "Members access marketing_posts" ON public.marketing_posts;
CREATE POLICY "Members access marketing_posts" ON public.marketing_posts
  FOR ALL USING (private.is_business_member(business_id, auth.uid()))
  WITH CHECK (private.is_business_member(business_id, auth.uid()));

-- audit_log (keeps split SELECT/INSERT structure)
DROP POLICY IF EXISTS "Members read audit_log" ON public.audit_log;
CREATE POLICY "Members read audit_log" ON public.audit_log
  FOR SELECT USING (private.is_business_member(business_id, auth.uid()));

DROP POLICY IF EXISTS "Members insert audit_log" ON public.audit_log;
CREATE POLICY "Members insert audit_log" ON public.audit_log
  FOR INSERT WITH CHECK (private.is_business_member(business_id, auth.uid()));

-- Now safe to drop the public versions.
DROP FUNCTION IF EXISTS public.is_business_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.has_business_role(uuid, uuid, member_role[]);