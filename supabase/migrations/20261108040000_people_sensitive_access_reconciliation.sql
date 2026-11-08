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

-- Keep non-admin operational RPC payloads minimal and remove unnecessary PII.
CREATE OR REPLACE FUNCTION public.people_employees_limited(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_member boolean;
BEGIN
  SELECT private.is_business_member(p_business_id, auth.uid()) INTO v_member;
  IF NOT v_member THEN
    RAISE EXCEPTION 'No tiene acceso a este negocio' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'first_name', first_name, 'last_name', last_name,
      'job_title', job_title, 'department', department,
      'employment_status', employment_status
    ))
    FROM public.people_employees
    WHERE business_id = p_business_id
    ORDER BY last_name, first_name
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.people_leave_requests_limited(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_member boolean;
BEGIN
  SELECT private.is_business_member(p_business_id, auth.uid()) INTO v_member;
  IF NOT v_member THEN
    RAISE EXCEPTION 'No tiene acceso a este negocio' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'employee_id', employee_id, 'leave_type', leave_type,
      'start_date', start_date, 'end_date', end_date, 'days', days,
      'status', status, 'created_at', created_at
    ))
    FROM public.people_leave_requests
    WHERE business_id = p_business_id
    ORDER BY created_at DESC
    LIMIT 500
  ), '[]'::jsonb);
END;
$$;

-- Termination history is owner/admin-only; non-admin UI uses no RPC for it.
REVOKE ALL ON FUNCTION public.people_terminations_limited(uuid) FROM PUBLIC, anon, authenticated;
