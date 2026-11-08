-- Nüva People: reconcile sensitive table policies without dropping unrelated RLS rules.
-- Production currently has permissive member SELECT policies that OR together
-- with owner/admin policies. Remove only the broad policies and preserve all
-- unrelated write/operational policies. Contracts, employee PII and documents
-- are writable only by owner/admin.


-- Reconcile policy state by command, not by historical policy names. Earlier
-- migrations and hotfixes used several names for equivalent permissive rules;
-- PostgreSQL ORs permissive policies, so every SELECT policy on these sensitive
-- tables must be replaced with exactly one owner/admin policy below. For the
-- operational submission tables, replace all INSERT/UPDATE rules with the
-- explicit staff-submit and owner/admin-review rules below. DELETE policies
-- are deliberately preserved.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (tablename = ANY (ARRAY[
          'people_employees','people_contracts','people_documents',
          'people_attendance_events','people_compliance_items','people_absences',
          'people_payroll_items','people_payroll_periods','people_payroll_postings','people_payroll_runs',
          'people_payroll_inputs','people_lre_exports','people_lre_rows','people_leave_requests',
          'people_terminations','people_vacation_balances','people_gratification_settings',
          'people_gratification_settlements','people_payroll_liquidations'
        ]::text[]) AND cmd IN ('SELECT','ALL'))
        OR
        (tablename = ANY (ARRAY[
          'people_employees','people_contracts','people_documents',
          'people_attendance_events','people_compliance_items','people_leave_requests'
        ]::text[]) AND cmd IN ('INSERT','UPDATE'))
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END;
$$;

-- Remove broad member SELECT policies. Owner/admin SELECT policies already exist
-- on these tables and remain the sole permissive SELECT path.
DROP POLICY IF EXISTS people_member_select ON public.people_employees;
DROP POLICY IF EXISTS people_member_select ON public.people_contracts;
DROP POLICY IF EXISTS people_member_select ON public.people_documents;
DROP POLICY IF EXISTS people_member_select ON public.people_payroll_items;
DROP POLICY IF EXISTS people_member_select ON public.people_payroll_periods;
DROP POLICY IF EXISTS people_member_select ON public.people_payroll_postings;
DROP POLICY IF EXISTS people_member_select ON public.people_payroll_runs;

-- Evaluate auth.uid() once per statement rather than once per row on
-- the existing owner/admin policies; this preserves authorization semantics.
DROP POLICY IF EXISTS people_contracts_select_owner_admin ON public.people_contracts;
DROP POLICY IF EXISTS people_contracts_select_owner_admin ON public.people_contracts;
CREATE POLICY people_contracts_select_owner_admin ON public.people_contracts
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_employees_select_owner_admin ON public.people_employees;
DROP POLICY IF EXISTS people_employees_select_owner_admin ON public.people_employees;
CREATE POLICY people_employees_select_owner_admin ON public.people_employees
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_documents_select_owner_admin ON public.people_documents;
DROP POLICY IF EXISTS people_documents_select_owner_admin ON public.people_documents;
CREATE POLICY people_documents_select_owner_admin ON public.people_documents
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_lre_rows_select_owner_admin ON public.people_lre_rows;
DROP POLICY IF EXISTS people_lre_rows_select_owner_admin ON public.people_lre_rows;
CREATE POLICY people_lre_rows_select_owner_admin ON public.people_lre_rows
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_payroll_items_select_owner_admin ON public.people_payroll_items;
DROP POLICY IF EXISTS people_payroll_items_select_owner_admin ON public.people_payroll_items;
CREATE POLICY people_payroll_items_select_owner_admin ON public.people_payroll_items
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_payroll_periods_select_owner_admin ON public.people_payroll_periods;
DROP POLICY IF EXISTS people_payroll_periods_select_owner_admin ON public.people_payroll_periods;
CREATE POLICY people_payroll_periods_select_owner_admin ON public.people_payroll_periods
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_payroll_postings_select_owner_admin ON public.people_payroll_postings;
DROP POLICY IF EXISTS people_payroll_postings_select_owner_admin ON public.people_payroll_postings;
CREATE POLICY people_payroll_postings_select_owner_admin ON public.people_payroll_postings
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_payroll_runs_select_owner_admin ON public.people_payroll_runs;
DROP POLICY IF EXISTS people_payroll_runs_select_owner_admin ON public.people_payroll_runs;
CREATE POLICY people_payroll_runs_select_owner_admin ON public.people_payroll_runs
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_payroll_liquidations_select_owner_admin ON public.people_payroll_liquidations;
DROP POLICY IF EXISTS people_payroll_liquidations_select_owner_admin ON public.people_payroll_liquidations;
CREATE POLICY people_payroll_liquidations_select_owner_admin ON public.people_payroll_liquidations
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_absences_select_owner_admin ON public.people_absences;
DROP POLICY IF EXISTS people_absences_select_owner_admin ON public.people_absences;
CREATE POLICY people_absences_select_owner_admin ON public.people_absences
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));

-- Extend owner/admin-only access to payroll, LRE, leave, termination and
-- compensation records. Non-admin operational screens use explicitly limited RPCs.
DROP POLICY IF EXISTS people_member_select ON public.people_attendance_events;
DROP POLICY IF EXISTS people_member_select ON public.people_compliance_items;
-- Members may submit attendance/compliance/leave records, but cannot
-- rewrite another person's record or self-approve a request.
DROP POLICY IF EXISTS people_member_update ON public.people_attendance_events;
DROP POLICY IF EXISTS people_member_update ON public.people_compliance_items;
DROP POLICY IF EXISTS people_member_update ON public.people_leave_requests;

-- Members may submit their own operational events/requests. Review and
-- modification remain restricted to owner/admin through the UPDATE policies.
CREATE POLICY people_member_insert ON public.people_attendance_events
  FOR INSERT TO authenticated
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role, 'staff'::member_role]));
CREATE POLICY people_member_insert ON public.people_compliance_items
  FOR INSERT TO authenticated
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role, 'staff'::member_role]));
CREATE POLICY people_member_insert ON public.people_leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role, 'staff'::member_role]));

DROP POLICY IF EXISTS people_attendance_update_owner_admin ON public.people_attendance_events;
CREATE POLICY people_attendance_update_owner_admin ON public.people_attendance_events
  FOR UPDATE TO authenticated
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_compliance_update_owner_admin ON public.people_compliance_items;
CREATE POLICY people_compliance_update_owner_admin ON public.people_compliance_items
  FOR UPDATE TO authenticated
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_leave_requests_update_owner_admin ON public.people_leave_requests;
CREATE POLICY people_leave_requests_update_owner_admin ON public.people_leave_requests
  FOR UPDATE TO authenticated
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));

DROP POLICY IF EXISTS people_attendance_select_owner_admin ON public.people_attendance_events;
CREATE POLICY people_attendance_select_owner_admin ON public.people_attendance_events
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_compliance_select_owner_admin ON public.people_compliance_items;
CREATE POLICY people_compliance_select_owner_admin ON public.people_compliance_items
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_payroll_inputs_select ON public.people_payroll_inputs;
DROP POLICY IF EXISTS people_terminations_select ON public.people_terminations;
DROP POLICY IF EXISTS people_vacation_select ON public.people_vacation_balances;
DROP POLICY IF EXISTS people_member_select ON public.people_payroll_inputs;
DROP POLICY IF EXISTS people_member_select ON public.people_payroll_postings;
DROP POLICY IF EXISTS people_member_select ON public.people_payroll_runs;
DROP POLICY IF EXISTS people_member_select ON public.people_lre_exports;
DROP POLICY IF EXISTS people_member_select ON public.people_lre_rows;
DROP POLICY IF EXISTS people_member_select ON public.people_leave_requests;
DROP POLICY IF EXISTS people_member_select ON public.people_terminations;
DROP POLICY IF EXISTS people_member_select ON public.people_vacation_balances;
DROP POLICY IF EXISTS people_gratification_settings_select ON public.people_gratification_settings;
DROP POLICY IF EXISTS people_gratification_settlements_select ON public.people_gratification_settlements;

DROP POLICY IF EXISTS people_payroll_inputs_select_owner_admin ON public.people_payroll_inputs;
CREATE POLICY people_payroll_inputs_select_owner_admin ON public.people_payroll_inputs
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_payroll_postings_select_owner_admin ON public.people_payroll_postings;
CREATE POLICY people_payroll_postings_select_owner_admin ON public.people_payroll_postings
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_payroll_runs_select_owner_admin ON public.people_payroll_runs;
CREATE POLICY people_payroll_runs_select_owner_admin ON public.people_payroll_runs
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_lre_exports_select_owner_admin ON public.people_lre_exports;
CREATE POLICY people_lre_exports_select_owner_admin ON public.people_lre_exports
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_leave_requests_select_owner_admin ON public.people_leave_requests;
CREATE POLICY people_leave_requests_select_owner_admin ON public.people_leave_requests
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_terminations_select_owner_admin ON public.people_terminations;
CREATE POLICY people_terminations_select_owner_admin ON public.people_terminations
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_vacation_balances_select_owner_admin ON public.people_vacation_balances;
CREATE POLICY people_vacation_balances_select_owner_admin ON public.people_vacation_balances
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_gratification_settings_select_owner_admin ON public.people_gratification_settings;
CREATE POLICY people_gratification_settings_select_owner_admin ON public.people_gratification_settings
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_gratification_settlements_select_owner_admin ON public.people_gratification_settlements;
CREATE POLICY people_gratification_settlements_select_owner_admin ON public.people_gratification_settlements
  FOR SELECT TO authenticated USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));

-- Employee records contain personal, health and pension data.
DROP POLICY IF EXISTS people_member_insert ON public.people_employees;
DROP POLICY IF EXISTS people_member_update ON public.people_employees;
DROP POLICY IF EXISTS people_admin_insert ON public.people_employees;
DROP POLICY IF EXISTS people_admin_update ON public.people_employees;
DROP POLICY IF EXISTS people_admin_insert ON public.people_employees;
CREATE POLICY people_admin_insert ON public.people_employees
  FOR INSERT TO authenticated
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_admin_update ON public.people_employees;
CREATE POLICY people_admin_update ON public.people_employees
  FOR UPDATE TO authenticated
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));

-- Contracts include salary and employment terms.
DROP POLICY IF EXISTS people_member_insert ON public.people_contracts;
DROP POLICY IF EXISTS people_member_update ON public.people_contracts;
DROP POLICY IF EXISTS people_admin_insert ON public.people_contracts;
DROP POLICY IF EXISTS people_admin_update ON public.people_contracts;
DROP POLICY IF EXISTS people_admin_insert ON public.people_contracts;
CREATE POLICY people_admin_insert ON public.people_contracts
  FOR INSERT TO authenticated
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_admin_update ON public.people_contracts;
CREATE POLICY people_admin_update ON public.people_contracts
  FOR UPDATE TO authenticated
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));

-- Employee documents are owner/admin managed.
DROP POLICY IF EXISTS people_member_insert ON public.people_documents;
DROP POLICY IF EXISTS people_member_update ON public.people_documents;
DROP POLICY IF EXISTS people_admin_insert ON public.people_documents;
DROP POLICY IF EXISTS people_admin_update ON public.people_documents;
DROP POLICY IF EXISTS people_admin_insert ON public.people_documents;
CREATE POLICY people_admin_insert ON public.people_documents
  FOR INSERT TO authenticated
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));
DROP POLICY IF EXISTS people_admin_update ON public.people_documents;
CREATE POLICY people_admin_update ON public.people_documents
  FOR UPDATE TO authenticated
  USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY['owner'::member_role, 'admin'::member_role]));


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
      'id', e.id, 'first_name', e.first_name, 'last_name', e.last_name,
      'job_title', e.job_title, 'department', e.department,
      'employment_status', e.employment_status
    ) ORDER BY e.last_name, e.first_name)
    FROM public.people_employees e
    WHERE e.business_id = p_business_id
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
      'id', lr.id, 'employee_id', lr.employee_id, 'leave_type', lr.leave_type,
      'start_date', lr.start_date, 'end_date', lr.end_date, 'days', lr.days,
      'status', lr.status, 'created_at', lr.created_at
    ) ORDER BY lr.created_at DESC)
    FROM (
      SELECT id, employee_id, leave_type, start_date, end_date, days, status, created_at
      FROM public.people_leave_requests
      WHERE business_id = p_business_id
        AND leave_type <> 'medical'
      ORDER BY created_at DESC
      LIMIT 500
    ) lr
  ), '[]'::jsonb);
END;
$$;

-- Explicitly scope the two sanitized member RPCs to authenticated users.
-- Do not rely on PostgreSQL's default PUBLIC EXECUTE privilege for new functions.
REVOKE ALL ON FUNCTION public.people_employees_limited(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.people_leave_requests_limited(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.people_employees_limited(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.people_leave_requests_limited(uuid) TO authenticated;

-- Termination history is owner/admin-only; non-admin UI uses no RPC for it.
REVOKE ALL ON FUNCTION public.people_terminations_limited(uuid) FROM PUBLIC, anon, authenticated;

-- Balance calculation is an administrative payroll operation, not a staff RPC.
CREATE OR REPLACE FUNCTION public.calculate_people_vacation_balance(
  p_employee_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, private
AS $function$
DECLARE
  e record;
  accrued numeric;
  used numeric;
  available numeric;
BEGIN
  SELECT * INTO e FROM public.people_employees WHERE id = p_employee_id;
  IF NOT FOUND OR NOT private.has_business_role(
    e.business_id,
    (SELECT auth.uid()),
    ARRAY['owner'::member_role, 'admin'::member_role]
  ) THEN
    RAISE EXCEPTION 'owner/admin role required';
  END IF;

  accrued := public.people_accrued_vacation_days(e.hire_date, p_as_of_date);
  SELECT COALESCE(sum(public.people_working_days_between(a.starts_on, a.ends_on)), 0)
    INTO used
  FROM public.people_absences a
  WHERE a.employee_id = p_employee_id
    AND a.business_id = e.business_id
    AND a.absence_type = 'vacation'
    AND a.starts_on >= e.hire_date
    AND a.ends_on <= p_as_of_date;

  available := greatest(0, accrued - used);
  INSERT INTO public.people_vacation_balances(
    business_id, employee_id, as_of_date, accrued_days, used_days, available_days, progressive_days
  )
  VALUES(e.business_id, p_employee_id, p_as_of_date, accrued, used, available, 0)
  ON CONFLICT(employee_id, as_of_date) DO UPDATE
    SET accrued_days = EXCLUDED.accrued_days,
        used_days = EXCLUDED.used_days,
        available_days = EXCLUDED.available_days,
        progressive_days = EXCLUDED.progressive_days;

  RETURN jsonb_build_object(
    'employee_id', p_employee_id,
    'as_of_date', p_as_of_date,
    'accrued_days', accrued,
    'used_days', used,
    'available_days', available,
    'progressive_days', 0
  );
END
$function$;

-- Vacation balances are compensation-related employee data. Non-admin users
-- must not fetch the whole team's balances; the UI hides this panel for them.
REVOKE ALL ON FUNCTION public.people_vacation_balances_limited(uuid) FROM PUBLIC, anon, authenticated;
