-- Nüva People: restrict sensitive HR/payroll data to business owners and admins.
-- Proposal only: do not apply to production without review and the paired pgTAP suite.
-- Staff operational reads are provided through people_employee_operational, which omits
-- national identifiers, contact details, banking, health/pension, and compensation fields.

DO $migration$
DECLARE
  t text;
  had_insert boolean;
  had_update boolean;
  had_delete boolean;
  policy_row record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'people_employees',
    'people_contracts',
    'people_documents',
    'people_absences',
    'people_leave_requests',
    'people_compliance_items',
    'people_vacation_balances',
    'people_payroll_periods',
    'people_payroll_inputs',
    'people_payroll_items',
    'people_payroll_liquidations',
    'people_payroll_postings',
    'people_payroll_runs',
    'people_lre_rows',
    'people_lre_exports',
    'people_karin_cases',
    'people_gratification_settings',
    'people_gratification_settlements'
  ] LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE EXCEPTION 'Expected Nüva People table public.% is missing; aborting hardening', t;
    END IF;

    SELECT
      coalesce(bool_or(cmd IN ('INSERT', 'ALL')), false),
      coalesce(bool_or(cmd IN ('UPDATE', 'ALL')), false),
      coalesce(bool_or(cmd IN ('DELETE', 'ALL')), false)
    INTO had_insert, had_update, had_delete
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = t;

    -- Replace every policy on these sensitive tables so an older permissive policy
    -- cannot continue granting access alongside the new restrictive policy set.
    FOR policy_row IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_row.policyname, t);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format(
      'CREATE POLICY people_sensitive_select_admin ON public.%I FOR SELECT TO authenticated
       USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY[''owner'',''admin'']::public.member_role[]))',
      t
    );

    IF had_insert THEN
      EXECUTE format(
        'CREATE POLICY people_sensitive_insert_admin ON public.%I FOR INSERT TO authenticated
         WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY[''owner'',''admin'']::public.member_role[]))',
        t
      );
    END IF;

    IF had_update THEN
      EXECUTE format(
        'CREATE POLICY people_sensitive_update_admin ON public.%I FOR UPDATE TO authenticated
         USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY[''owner'',''admin'']::public.member_role[]))
         WITH CHECK (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY[''owner'',''admin'']::public.member_role[]))',
        t
      );
    END IF;

    IF had_delete THEN
      EXECUTE format(
        'CREATE POLICY people_sensitive_delete_admin ON public.%I FOR DELETE TO authenticated
         USING (private.has_business_role(business_id, (SELECT auth.uid()), ARRAY[''owner'',''admin'']::public.member_role[]))',
        t
      );
    END IF;
  END LOOP;
END
$migration$;

-- Operational employee directory for staff: intentionally excludes sensitive columns.
-- Design (repo security invariant: every client-exposed view must be security_invoker):
-- the safe row projection lives in a STABLE SECURITY DEFINER function with an explicit
-- membership check, and the client-facing view is security_invoker so callers execute
-- it with their own privileges. The function is the only privileged component, it filters
-- rows by the CALLER's membership (passed as an argument, never re-read inside), and it
-- projects a fixed safe column list — identity, contact, banking, health/pension and
-- compensation fields are structurally absent.
CREATE OR REPLACE FUNCTION private.people_employee_operational_rows(_user_id uuid)
RETURNS TABLE (
  id uuid,
  business_id uuid,
  first_name text,
  last_name text,
  hire_date date,
  employment_status text,
  employment_type text,
  job_title text,
  department text,
  manager_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id, e.business_id, e.first_name, e.last_name, e.hire_date,
    e.employment_status, e.employment_type, e.job_title, e.department,
    e.manager_id, e.created_at, e.updated_at
  FROM public.people_employees AS e
  WHERE private.is_business_member(e.business_id, _user_id)
$$;

GRANT EXECUTE ON FUNCTION private.people_employee_operational_rows(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.people_employee_operational_rows(uuid) FROM anon;

CREATE OR REPLACE VIEW public.people_employee_operational
WITH (security_invoker = true) AS
SELECT
  rows.id,
  rows.business_id,
  rows.first_name,
  rows.last_name,
  rows.hire_date,
  rows.employment_status,
  rows.employment_type,
  rows.job_title,
  rows.department,
  rows.manager_id,
  rows.created_at,
  rows.updated_at
FROM private.people_employee_operational_rows((SELECT auth.uid())) AS rows;

GRANT SELECT ON public.people_employee_operational TO authenticated;

COMMENT ON VIEW public.people_employee_operational IS
  'Limited operational employee directory for authenticated business members. Sensitive HR, identity, banking, health and compensation fields are intentionally excluded.';
