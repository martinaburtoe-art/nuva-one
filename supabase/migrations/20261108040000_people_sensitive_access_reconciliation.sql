-- Nüva People: reconcile sensitive table policies without dropping unrelated RLS rules.
-- Production currently has permissive member SELECT policies that OR together
-- with owner/admin policies. Remove only the broad policies and preserve all
-- unrelated write/operational policies. Contracts, employee PII and documents
-- are writable only by owner/admin.

BEGIN;

-- Remove broad member SELECT policies. Owner/admin SELECT policies already exist
-- on these tables and remain the sole permissive SELECT path.
DROP POLICY IF EXISTS people_member_select ON public.people_employees;
DROP POLICY IF EXISTS people_member_select ON public.people_contracts;
DROP POLICY IF EXISTS people_member_select ON public.people_documents;
DROP POLICY IF EXISTS people_member_select ON public.people_payroll_items;
DROP POLICY IF EXISTS people_member_select ON public.people_payroll_periods;
DROP POLICY IF EXISTS people_member_select ON public.people_payroll_postings;
DROP POLICY IF EXISTS people_member_select ON public.people_payroll_runs;

-- Employee records contain personal, health and pension data.
DROP POLICY IF EXISTS people_member_insert ON public.people_employees;
DROP POLICY IF EXISTS people_member_update ON public.people_employees;
DROP POLICY IF EXISTS people_admin_insert ON public.people_employees;
DROP POLICY IF EXISTS people_admin_update ON public.people_employees;
CREATE POLICY people_admin_insert ON public.people_employees
  FOR INSERT TO authenticated
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
CREATE POLICY people_admin_update ON public.people_employees
  FOR UPDATE TO authenticated
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));

-- Contracts include salary and employment terms.
DROP POLICY IF EXISTS people_member_insert ON public.people_contracts;
DROP POLICY IF EXISTS people_member_update ON public.people_contracts;
DROP POLICY IF EXISTS people_admin_insert ON public.people_contracts;
DROP POLICY IF EXISTS people_admin_update ON public.people_contracts;
CREATE POLICY people_admin_insert ON public.people_contracts
  FOR INSERT TO authenticated
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
CREATE POLICY people_admin_update ON public.people_contracts
  FOR UPDATE TO authenticated
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));

-- Employee documents are owner/admin managed.
DROP POLICY IF EXISTS people_member_insert ON public.people_documents;
DROP POLICY IF EXISTS people_member_update ON public.people_documents;
DROP POLICY IF EXISTS people_admin_insert ON public.people_documents;
DROP POLICY IF EXISTS people_admin_update ON public.people_documents;
CREATE POLICY people_admin_insert ON public.people_documents
  FOR INSERT TO authenticated
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
CREATE POLICY people_admin_update ON public.people_documents
  FOR UPDATE TO authenticated
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));

COMMIT;
